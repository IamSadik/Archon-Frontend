import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Send, Bot, User, Loader2, Sparkles, FolderTree, FileCode2, Boxes, Plus, Pin, Search, RotateCcw, MessageSquare, Pencil, Archive, Trash2, Check, X, ArrowLeft } from 'lucide-react'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useChatSessions, useChatMessages, useCreateSession, usePinSession } from '@/hooks/useChat'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import { MessageFormatter } from './chat/message-formatter'
import { AgentPipelineTrace, extractAgentTrace, type AgentTraceItem } from './chat/agent-pipeline-trace'
import { useQueryClient } from '@tanstack/react-query'
import { chatService } from '@/services/chat.service'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { CodeChangesPreviewResponse, ChatStreamChunk } from '@/types'

type FocusMode = 'codebase' | 'folder' | 'file'

interface IDEFocusContext {
    kind: 'codebase' | 'folder' | 'file'
    path?: string
    content?: string
}

interface ProjectChatProps {
    projectId: string
    className?: string
    activeContext?: IDEFocusContext
}

interface OptimisticMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    created_at: string
    optimistic: true
    status?: 'sending' | 'streaming'
}

function scoreCodeIntent(message: string, activeContext?: IDEFocusContext, focusMode: FocusMode = 'codebase', resolvedFocusPath?: string) {
    const text = message.trim().toLowerCase()
    if (!text) return 0

    let score = 0
    const codeEditTerms = /(fix|update|change|modify|edit|implement|create|add|remove|refactor|patch|debug|optimi[sz]e|rewrite|rename|convert|migrate|build|generate|configure|config|wire|integrate|enable|allow|connect|register|mount|attach|setup|set up|handle|write|populate|fill)\b/i
    const projectQuestionTerms = /(what is this project|what does this project do|tell me about this project|do you know what this project is about|what is the project about|explain this project|summary of this project|project overview)\b/i
    const chatTerms = /(hello|hi|hey|thanks?|thank you|how are you|good morning|good afternoon|what is|why is|why did|why does|what does|explain|summar(?:y|ize|ise)|describe|chat|how do i|how to)\b/i

    if (projectQuestionTerms.test(text)) return 0
    if (text.includes('```') || /`[^`]+`/.test(text)) score += 2
    if (codeEditTerms.test(text)) score += 3
    if (/[/\\][\w\-.]+\.[a-z0-9]{1,8}\b/i.test(text)) score += 2
    if (/\b(cors|cross[- ]origin)\b/i.test(text)) score += 2
    if (/\b(api|frontend|backend|middleware|auth|route|controller|model|service|schema|config|env)\b/i.test(text)) score += 1
    if (codeEditTerms.test(text) && (activeContext?.kind === 'file' || activeContext?.kind === 'folder' || resolvedFocusPath)) score += 1
    if (codeEditTerms.test(text) && focusMode !== 'codebase') score += 1
    if (chatTerms.test(text)) score -= 2
    if (/\b(what is|what are|explain|tell me about|describe|summar(?:y|ize|ise)|why is|why does|why did)\b/i.test(text)) score -= 1
    if (text.split(/\s+/).length <= 4 && chatTerms.test(text)) score -= 2

    return score
}

function isCodeTaskMessage(message: string, activeContext?: IDEFocusContext, focusMode: FocusMode = 'codebase', resolvedFocusPath?: string) {
    return scoreCodeIntent(message, activeContext, focusMode, resolvedFocusPath) > 0
}

function shouldDirectApplyCodeChanges(message: string, activeContext?: IDEFocusContext, focusMode: FocusMode = 'codebase', resolvedFocusPath?: string) {
    // Agentic IDE: code tasks run through coder agent and apply files directly
    return isCodeTaskMessage(message, activeContext, focusMode, resolvedFocusPath)
}

export function ProjectChat({ projectId, className, activeContext }: ProjectChatProps) {
    const [input, setInput] = useState('')
    const [sessionSearch, setSessionSearch] = useState('')
    const [focusMode, setFocusMode] = useState<FocusMode>('codebase')
    const [optimisticMessage, setOptimisticMessage] = useState<OptimisticMessage | null>(null)
    const [streamingAssistant, setStreamingAssistant] = useState<OptimisticMessage | null>(null)
    const [isStreaming, setIsStreaming] = useState(false)
    const [isRegenerating, setIsRegenerating] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [previewResponse, setPreviewResponse] = useState<CodeChangesPreviewResponse | null>(null)
    const [previewMessage, setPreviewMessage] = useState('')
    const [selectedPreviewPath, setSelectedPreviewPath] = useState('')
    const [selectedPreviewPaths, setSelectedPreviewPaths] = useState<Record<string, boolean>>({})
    const [isApplyingPreview, setIsApplyingPreview] = useState(false)
    const [applyConflicts, setApplyConflicts] = useState<Array<{ path: string; expected_hash: string; current_hash: string }>>([])
    const [streamTelemetry, setStreamTelemetry] = useState<{ firstTokenMs?: number; totalMs?: number } | null>(null)
    const [agentStatuses, setAgentStatuses] = useState<AgentTraceItem[]>([])
    const [activeAgentMeta, setActiveAgentMeta] = useState<{
        route?: string
        intent?: string
        llmProvider?: string
        llmModel?: string
    } | null>(null)
    const [isSessionActionPending, setIsSessionActionPending] = useState(false)
    const sessionSearchRef = useRef<HTMLInputElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const composerRef = useRef<HTMLTextAreaElement>(null)
    const hasHydratedSessionRef = useRef(false)
    const queryClient = useQueryClient()

    const { data: sessions, isLoading: sessionsLoading, isError: sessionsError } = useChatSessions(projectId)
    const createSession = useCreateSession()
    const pinSession = usePinSession()
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

    useEffect(() => {
        if (hasHydratedSessionRef.current || !sessions || sessions.length === 0) {
            return
        }
        hasHydratedSessionRef.current = true

        const saved = typeof window !== 'undefined' ? localStorage.getItem(`archon.chat.active.${projectId}`) : null
        if (saved && sessions.some((s) => s.id === saved)) {
            setActiveSessionId(saved)
        }
    }, [sessions, activeSessionId, projectId])

    useEffect(() => {
        if (!sessions || sessions.length === 0 || !activeSessionId) {
            return
        }
        if (!sessions.some((session) => session.id === activeSessionId)) {
            setActiveSessionId(null)
        }
    }, [sessions, activeSessionId])

    useEffect(() => {
        if (typeof window === 'undefined') return
        if (!activeSessionId) {
            localStorage.removeItem(`archon.chat.active.${projectId}`)
            return
        }
        localStorage.setItem(`archon.chat.active.${projectId}`, activeSessionId)
    }, [activeSessionId, projectId])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const isCtrlK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'
            const isNewSession = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'n'

            if (isCtrlK) {
                event.preventDefault()
                sessionSearchRef.current?.focus()
                sessionSearchRef.current?.select()
            }

            if (isNewSession) {
                event.preventDefault()
                void handleCreateNewSession()
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId])

    const { data: messages, isLoading: messagesLoading, isError: messagesError } = useChatMessages(activeSessionId || '')
    const activeSession = useMemo(() => sessions?.find((session) => session.id === activeSessionId) || null, [sessions, activeSessionId])
    const previewFiles = previewResponse?.preview || []
    const hasPreviewFiles = previewFiles.length > 0

    const canUseFolderFocus = activeContext?.kind === 'folder' && !!activeContext.path
    const canUseFileFocus = activeContext?.kind === 'file' && !!activeContext.path

    useEffect(() => {
        if (focusMode === 'file' && !canUseFileFocus) {
            setFocusMode(canUseFolderFocus ? 'folder' : 'codebase')
        }
        if (focusMode === 'folder' && !canUseFolderFocus) {
            setFocusMode(canUseFileFocus ? 'file' : 'codebase')
        }
    }, [focusMode, canUseFileFocus, canUseFolderFocus])

    const resolvedFocusPath = useMemo(() => {
        if (focusMode === 'file' && canUseFileFocus) {
            return activeContext?.path
        }
        if (focusMode === 'folder' && canUseFolderFocus) {
            return activeContext?.path
        }
        return undefined
    }, [focusMode, canUseFileFocus, canUseFolderFocus, activeContext?.path])

    const filteredSessions = useMemo(() => {
        const source = sessions || []
        const sorted = [...source].sort((a, b) => {
            const aPinned = Boolean(a.is_pinned)
            const bPinned = Boolean(b.is_pinned)
            if (aPinned !== bPinned) return aPinned ? -1 : 1

            const aTime = new Date(a.last_message_at || a.created_at).getTime()
            const bTime = new Date(b.last_message_at || b.created_at).getTime()
            return bTime - aTime
        })
        const needle = sessionSearch.trim().toLowerCase()
        if (!needle) return sorted
        return sorted.filter((session) => {
            const title = (session.title || '').toLowerCase()
            const preview = (session.last_message_preview || '').toLowerCase()
            return title.includes(needle) || preview.includes(needle)
        })
    }, [sessions, sessionSearch])

    const openSession = useCallback((sessionId: string) => {
        setActiveSessionId(sessionId)
    }, [])

    const goToProjectHistory = useCallback(() => {
        setActiveSessionId(null)
    }, [])

    const displayMessages = useMemo(() => {
        const base = messages || []
        let next = [...base]

        if (optimisticMessage) {
            const existsInServerMessages = next.some(
                (msg) => msg.role === 'user' && msg.content.trim() === optimisticMessage.content.trim()
            )
            if (!existsInServerMessages) {
                next = [...next, optimisticMessage]
            }
        }

        if (streamingAssistant) {
            next = [...next, streamingAssistant]
        }

        return next
    }, [messages, optimisticMessage, streamingAssistant])

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            if (scrollAreaRef.current) {
                const scrollableArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
                if (scrollableArea) {
                    scrollableArea.scrollTop = scrollableArea.scrollHeight
                }
            }
        }, 100)
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [displayMessages, scrollToBottom])

    useEffect(() => {
        if (!composerRef.current) return
        composerRef.current.style.height = '0px'
        composerRef.current.style.height = `${Math.min(composerRef.current.scrollHeight, 180)}px`
    }, [input])

    useEffect(() => {
        // Refresh file tree after receiving agent response
        if (messages && messages.length > 0) {
            const lastMessage = messages[messages.length - 1]
            if (lastMessage.role === 'assistant') {
                // Invalidate IDE tree to trigger refresh
                setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ['ide-tree', projectId] })
                    queryClient.invalidateQueries({ queryKey: ['ide-tree-count', projectId] })
                    queryClient.invalidateQueries({ queryKey: ['recent-file-changes', projectId] })
                }, 500)
            }
        }
    }, [messages, projectId, queryClient])

    const ensureSession = async () => {
        let sessionId = activeSessionId
        if (!sessionId) {
            const newSession = await createSession.mutateAsync({
                project: projectId,
                title: 'General Chat',
            })
            sessionId = newSession.id
            setActiveSessionId(newSession.id)
        }
        return sessionId
    }

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault()
        const messageToSend = input.trim()
        if (!messageToSend) return

        const optimisticId = `optimistic-${Date.now()}`
        const optimistic: OptimisticMessage = {
            id: optimisticId,
            role: 'user',
            content: messageToSend,
            created_at: new Date().toISOString(),
            optimistic: true,
            status: 'sending',
        }

        setOptimisticMessage(optimistic)
        setInput('')

        try {
            const sessionId = await ensureSession()

            const codeTask = isCodeTaskMessage(messageToSend, activeContext, focusMode, resolvedFocusPath)
            const directApply = shouldDirectApplyCodeChanges(messageToSend, activeContext, focusMode, resolvedFocusPath)

            setIsStreaming(true)
            setAgentStatuses([
                { agent: 'orchestrator', content: 'Initializing agentic pipeline…' },
                ...(codeTask ? [{ agent: 'coder', content: 'Preparing planner + coder sub-agents…' }] : []),
            ])
            setActiveAgentMeta(codeTask ? { route: codeTask ? 'execution' : 'query' } : null)
            setStreamingAssistant({
                id: `assistant-stream-${Date.now()}`,
                role: 'assistant',
                content: '',
                created_at: new Date().toISOString(),
                optimistic: true,
                status: 'streaming',
            })

            const finalChunk = await chatService.streamMessage(
                sessionId,
                projectId,
                messageToSend,
                {
                    applyCodeChanges: directApply,
                    focusMode,
                    focusPath: resolvedFocusPath,
                    selectedFilePath: focusMode === 'file' ? activeContext?.path : undefined,
                    selectedFileContent: focusMode === 'file' ? activeContext?.content : undefined,
                    onChunk: (chunk: ChatStreamChunk) => {
                        if (chunk.type === 'agent_status') {
                            setAgentStatuses((prev) => [
                                ...prev.slice(-6),
                                {
                                    agent: chunk.agent || 'agent',
                                    content: chunk.content,
                                    intent: chunk.intent,
                                    confidence: chunk.confidence,
                                },
                            ])
                        }
                        if (chunk.type === 'status' && chunk.content) {
                            setAgentStatuses((prev) => [
                                ...prev.slice(-6),
                                { agent: 'system', content: chunk.content },
                            ])
                        }
                        if (chunk.type === 'chunk') {
                            setStreamingAssistant((prev) => prev ? {
                                ...prev,
                                content: `${prev.content}${chunk.content}`,
                            } : prev)
                        }
                        if (chunk.type === 'complete' && chunk.metadata) {
                            setActiveAgentMeta({
                                route: chunk.metadata.route,
                                intent: chunk.metadata.intent,
                                llmProvider: chunk.metadata.llm_provider,
                                llmModel: chunk.metadata.llm_model,
                            })
                            const savedTrace = extractAgentTrace(chunk.metadata)
                            if (savedTrace.length > 0) {
                                setAgentStatuses(savedTrace)
                            }
                        }
                    },
                }
            )

            const appliedFiles: string[] = Array.isArray(finalChunk?.applied_files)
                ? finalChunk.applied_files
                : Array.isArray(finalChunk?.metadata?.coder_result?.files_modified)
                    ? finalChunk.metadata.coder_result.files_modified
                    : []
            appliedFiles.forEach((filePath) => {
                queryClient.invalidateQueries({ queryKey: ['ide-file', projectId, filePath] })
            })
            if (appliedFiles.length > 0) {
                queryClient.invalidateQueries({ queryKey: ['ide-tree', projectId] })
                queryClient.invalidateQueries({ queryKey: ['ide-tree-count', projectId] })
                queryClient.invalidateQueries({ queryKey: ['recent-file-changes', projectId] })
            }
            queryClient.invalidateQueries({ queryKey: ['chat', 'session', sessionId, 'messages'] })
            queryClient.invalidateQueries({ queryKey: ['chat', projectId, 'sessions'] })
            setStreamTelemetry({
                firstTokenMs: finalChunk?.telemetry?.first_token_latency_ms ?? undefined,
                totalMs: finalChunk?.telemetry?.total_latency_ms ?? undefined,
            })
            if (finalChunk?.metadata) {
                setActiveAgentMeta({
                    route: finalChunk.metadata.route,
                    intent: finalChunk.metadata.intent,
                    llmProvider: finalChunk.metadata.llm_provider,
                    llmModel: finalChunk.metadata.llm_model,
                })
                const savedTrace = extractAgentTrace(finalChunk.metadata)
                if (savedTrace.length > 0) {
                    setAgentStatuses(savedTrace)
                }
            }
            setStreamingAssistant(null)
            setIsStreaming(false)
        } catch (error: any) {
            setInput(messageToSend)
            setOptimisticMessage(null)
            setStreamingAssistant(null)
            setIsStreaming(false)
            setPreviewLoading(false)
            toast.error(error?.response?.data?.error || error?.message || 'Failed to send message')
        }
    }

    const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void handleSend()
        }
    }

    const handleCancelPreview = () => {
        if (previewMessage) {
            setInput(previewMessage)
        }
        setIsPreviewOpen(false)
        setPreviewResponse(null)
        setPreviewMessage('')
        setSelectedPreviewPath('')
        setSelectedPreviewPaths({})
        setApplyConflicts([])
        setOptimisticMessage(null)
        setPreviewLoading(false)
    }

    const handleApplyPreview = async () => {
        if (!previewResponse) return
        setIsApplyingPreview(true)
        try {
            const selectedChanges = previewResponse.file_changes.filter((item) => selectedPreviewPaths[item.path] !== false)
            if (selectedChanges.length === 0) {
                toast.error('Select at least one file to apply')
                setIsApplyingPreview(false)
                return
            }
            const response = await chatService.applyReviewedChanges(
                previewResponse.session_id,
                selectedChanges,
                previewResponse.summary,
                previewMessage,
            )
            const appliedFiles: string[] = Array.isArray(response?.applied_files) ? response.applied_files : []
            appliedFiles.forEach((filePath) => {
                queryClient.invalidateQueries({ queryKey: ['ide-file', projectId, filePath] })
            })
            if (appliedFiles.length > 0) {
                queryClient.invalidateQueries({ queryKey: ['ide-tree', projectId] })
                queryClient.invalidateQueries({ queryKey: ['ide-tree-count', projectId] })
                queryClient.invalidateQueries({ queryKey: ['recent-file-changes', projectId] })
            }
            queryClient.invalidateQueries({ queryKey: ['chat', 'session', previewResponse.session_id, 'messages'] })
            queryClient.invalidateQueries({ queryKey: ['chat', projectId, 'sessions'] })

            setIsPreviewOpen(false)
            setPreviewResponse(null)
            setPreviewMessage('')
            setSelectedPreviewPath('')
            setSelectedPreviewPaths({})
            setApplyConflicts([])
            setOptimisticMessage(null)
        } catch (error: any) {
            const conflicts = error?.response?.data?.conflicts || []
            if (conflicts.length > 0) {
                setApplyConflicts(conflicts)
                toast.error('Conflicts detected. Refresh preview and retry apply.')
            } else {
                toast.error(error?.response?.data?.error || 'Failed to apply reviewed changes')
            }
        } finally {
            setIsApplyingPreview(false)
        }
    }

    const handleRenameSession = async (sessionId: string, currentTitle?: string) => {
        const nextTitle = window.prompt('Rename chat session', currentTitle || 'Untitled chat')
        if (!nextTitle || !nextTitle.trim()) return
        setIsSessionActionPending(true)
        try {
            await chatService.renameSession(sessionId, nextTitle.trim())
            queryClient.invalidateQueries({ queryKey: ['chat', projectId, 'sessions'] })
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to rename session')
        } finally {
            setIsSessionActionPending(false)
        }
    }

    const handleArchiveSession = async (sessionId: string, archived: boolean) => {
        setIsSessionActionPending(true)
        try {
            await chatService.archiveSession(sessionId, archived)
            queryClient.invalidateQueries({ queryKey: ['chat', projectId, 'sessions'] })
            if (archived && activeSessionId === sessionId) {
                setActiveSessionId(null)
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to archive session')
        } finally {
            setIsSessionActionPending(false)
        }
    }

    const handleDeleteSession = async (sessionId: string) => {
        const confirmed = window.confirm('Delete this chat session permanently?')
        if (!confirmed) return
        setIsSessionActionPending(true)
        try {
            await chatService.deleteSession(sessionId)
            queryClient.invalidateQueries({ queryKey: ['chat', projectId, 'sessions'] })
            queryClient.removeQueries({ queryKey: ['chat', 'session', sessionId, 'messages'] })
            if (activeSessionId === sessionId) {
                setActiveSessionId(null)
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to delete session')
        } finally {
            setIsSessionActionPending(false)
        }
    }

    const handleCreateNewSession = async () => {
        try {
            const newSession = await createSession.mutateAsync({
                project: projectId,
                title: 'New Chat',
            })
            setActiveSessionId(newSession.id)
            setOptimisticMessage(null)
            setInput('')
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to create chat session')
        }
    }

    const handlePinSession = async (sessionId: string, pinned: boolean) => {
        try {
            await pinSession.mutateAsync({ sessionId, pinned, projectId })
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to update pin state')
        }
    }

    const handleRegenerate = async () => {
        if (!activeSessionId) return
        setIsRegenerating(true)
        try {
            await chatService.regenerateResponse(activeSessionId)
            queryClient.invalidateQueries({ queryKey: ['chat', 'session', activeSessionId, 'messages'] })
            queryClient.invalidateQueries({ queryKey: ['chat', projectId, 'sessions'] })
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to regenerate response')
        } finally {
            setIsRegenerating(false)
        }
    }

    useEffect(() => {
        if (!optimisticMessage || !messages || messages.length === 0) return
        const confirmed = messages.some(
            (msg) => msg.role === 'user' && msg.content.trim() === optimisticMessage.content.trim()
        )
        if (confirmed) {
            setOptimisticMessage(null)
        }
    }, [messages, optimisticMessage])

    return (
        <>
            <Card className={`flex min-h-0 w-full min-w-0 flex-col overflow-hidden ${className || ''}`}>
                <CardContent className='flex min-h-0 w-full flex-1 flex-col p-0'>
                    {activeSessionId ? (
                        <section className='flex min-h-0 flex-1 flex-col'>
                            <CardHeader className='space-y-3 border-b pb-3 pt-3'>
                                <div className='flex items-center justify-between gap-3'>
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='sm'
                                        className='h-8 gap-1 px-2 text-xs'
                                        onClick={goToProjectHistory}
                                    >
                                        <ArrowLeft className='h-3.5 w-3.5' />
                                        Back
                                    </Button>
                                    <div className='min-w-0 flex-1 text-right'>
                                        <div className='truncate text-sm font-semibold'>
                                            {activeSession?.title || 'Active chat'}
                                        </div>
                                        <div className='text-xs text-muted-foreground'>
                                            Project chat
                                        </div>
                                    </div>
                                </div>

                                <CardTitle className='flex items-center gap-2 text-base'>
                                    <MessageSquare className='h-4 w-4 text-primary' /> Agentic Chat
                                </CardTitle>

                                <div className='rounded-md border border-primary/25 bg-gradient-to-r from-primary/10 to-transparent p-2.5 text-xs'>
                                    <div className='mb-1.5 font-semibold text-primary'>Multi-agent pipeline</div>
                                    <div className='flex flex-wrap gap-1.5'>
                                        {['Orchestrator', 'Memory', 'Planner', 'Coder'].map((agent) => (
                                            <Badge
                                                key={agent}
                                                variant={isStreaming ? 'default' : 'secondary'}
                                                className='text-[10px] font-medium'
                                            >
                                                {isStreaming ? <Loader2 className='mr-1 h-3 w-3 animate-spin' /> : <Sparkles className='mr-1 h-3 w-3' />}
                                                {agent}
                                            </Badge>
                                        ))}
                                    </div>
                                    <p className='mt-1.5 text-muted-foreground'>
                                        Code requests route through planner + coder, edit workspace files, and update project memory.
                                    </p>
                                </div>

                                <div className='flex flex-wrap items-center gap-2 text-xs'>
                                    <Badge variant='secondary' className='gap-1'>
                                        <Sparkles className='h-3 w-3' /> IDE-aware
                                    </Badge>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        className='h-7 text-xs'
                                        disabled={!input.trim() || isStreaming || previewLoading}
                                        onClick={async () => {
                                            const text = input.trim()
                                            if (!text) return
                                            setPreviewLoading(true)
                                            try {
                                                const sessionId = await ensureSession()
                                                const preview = await chatService.previewCodeChanges(sessionId, projectId, text, {
                                                    focusMode,
                                                    focusPath: resolvedFocusPath,
                                                    selectedFilePath: focusMode === 'file' ? activeContext?.path : undefined,
                                                    selectedFileContent: focusMode === 'file' ? activeContext?.content : undefined,
                                                })
                                                setPreviewResponse(preview)
                                                setPreviewMessage(text)
                                                setSelectedPreviewPath(preview.preview?.[0]?.path || '')
                                                const defaultSelection: Record<string, boolean> = {}
                                                ;(preview.preview || []).forEach((item) => { defaultSelection[item.path] = true })
                                                setSelectedPreviewPaths(defaultSelection)
                                                setIsPreviewOpen(true)
                                            } catch (error: any) {
                                                toast.error(error?.message || 'Preview failed')
                                            } finally {
                                                setPreviewLoading(false)
                                            }
                                        }}
                                    >
                                        Preview edits
                                    </Button>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        className='h-7 text-xs'
                                        onClick={handleRegenerate}
                                        disabled={!activeSessionId || isRegenerating}
                                    >
                                        {isRegenerating ? <Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' /> : <RotateCcw className='mr-1 h-3.5 w-3.5' />}
                                        Regenerate
                                    </Button>
                                </div>

                                <div className='grid gap-2 sm:grid-cols-3'>
                                    <Button
                                        type='button'
                                        variant={focusMode === 'codebase' ? 'default' : 'outline'}
                                        size='sm'
                                        className='h-8 justify-start text-xs'
                                        onClick={() => setFocusMode('codebase')}
                                    >
                                        <Boxes className='mr-1 h-3.5 w-3.5' /> Entire codebase
                                    </Button>
                                    <Button
                                        type='button'
                                        variant={focusMode === 'folder' ? 'default' : 'outline'}
                                        size='sm'
                                        className='h-8 justify-start text-xs'
                                        onClick={() => setFocusMode('folder')}
                                        disabled={!canUseFolderFocus}
                                    >
                                        <FolderTree className='mr-1 h-3.5 w-3.5' /> Current folder
                                    </Button>
                                    <Button
                                        type='button'
                                        variant={focusMode === 'file' ? 'default' : 'outline'}
                                        size='sm'
                                        className='h-8 justify-start text-xs'
                                        onClick={() => setFocusMode('file')}
                                        disabled={!canUseFileFocus}
                                    >
                                        <FileCode2 className='mr-1 h-3.5 w-3.5' /> Current file
                                    </Button>
                                </div>

                                <div className='rounded-md border bg-muted/30 px-2 py-1 text-xs text-muted-foreground'>
                                    Focus: <span className='font-medium'>{focusMode}</span>
                                    {resolvedFocusPath ? <span className='font-mono'> - {resolvedFocusPath}</span> : null}
                                    {streamTelemetry?.firstTokenMs ? (
                                        <span className='ml-2'>| First token: <span className='font-medium'>{streamTelemetry.firstTokenMs}ms</span></span>
                                    ) : null}
                                    {streamTelemetry?.totalMs ? (
                                        <span className='ml-2'>| Total: <span className='font-medium'>{streamTelemetry.totalMs}ms</span></span>
                                    ) : null}
                                </div>

                                {isStreaming && agentStatuses.length > 0 ? (
                                    <div className='text-xs text-primary'>
                                        Agent pipeline running…
                                    </div>
                                ) : null}

                                {sessionsError ? (
                                    <p className='text-xs text-destructive'>Session sync failed. You can still send a message to recreate a session.</p>
                                ) : null}
                            </CardHeader>

                            <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
                                <ScrollArea className='min-w-0 flex-1' ref={scrollAreaRef}>
                                    <div className='space-y-4 p-4 pb-3 pr-5'>
                                        {messagesLoading ? (
                                            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                                <Loader2 className='h-4 w-4 animate-spin' /> Loading messages...
                                            </div>
                                        ) : null}

                                        {displayMessages?.map((msg) => {
                                            const isStreamingAssistant = 'optimistic' in msg && msg.optimistic && 'status' in msg && msg.status === 'streaming'
                                            const savedTrace = msg.role === 'assistant' ? extractAgentTrace(msg.metadata) : []
                                            const trace = isStreamingAssistant ? agentStatuses : savedTrace
                                            const meta = isStreamingAssistant
                                                ? activeAgentMeta
                                                : (msg.metadata || null)

                                            return (
                                            <div key={msg.id} className={`flex w-full min-w-0 items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                                                <div className={msg.role === 'user' ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground' : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted'}>
                                                    {msg.role === 'user' ? <User className='h-4 w-4' /> : <Bot className='h-4 w-4' />}
                                                </div>
                                                <div className={msg.role === 'user' ? 'ml-auto min-w-0 w-full max-w-[min(42rem,calc(100%-3.5rem))] overflow-hidden rounded-lg bg-primary p-3 text-sm text-primary-foreground' : 'min-w-0 w-full max-w-[min(42rem,calc(100%-3.5rem))] overflow-hidden rounded-lg bg-muted p-3 text-sm'}>
                                                    {msg.role === 'assistant' && (trace.length > 0 || meta?.route || meta?.llm_provider) ? (
                                                        <AgentPipelineTrace
                                                            trace={trace}
                                                            isActive={isStreamingAssistant}
                                                            route={meta?.route}
                                                            intent={meta?.intent}
                                                            llmProvider={meta?.llm_provider || meta?.llmProvider}
                                                            llmModel={meta?.llm_model || meta?.llmModel}
                                                        />
                                                    ) : null}
                                                    <div className='mb-2 min-w-0 max-w-full break-words [overflow-wrap:anywhere]'>
                                                        <MessageFormatter content={msg.content} />
                                                    </div>
                                                    <div className='text-right text-[10px] opacity-70'>
                                                        {'optimistic' in msg && msg.optimistic
                                                            ? (('status' in msg && msg.status === 'streaming') ? 'streaming...' : 'sending...')
                                                            : formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                                    </div>
                                                </div>
                                            </div>
                                        )})}

                                        {!messagesLoading && messages && messages.length === 0 ? (
                                            <div className='py-10 text-center text-sm text-muted-foreground'>
                                                Start a conversation. You can target the full codebase, a folder, or a specific file.
                                            </div>
                                        ) : null}

                                        {messagesError ? (
                                            <div className='rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive'>
                                                Failed to load messages for this session.
                                            </div>
                                        ) : null}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>

                                <div className='border-t bg-background/80 p-3'>
                                    <form className='space-y-2' onSubmit={handleSend}>
                                        <div className='flex items-end gap-2'>
                                            <Textarea
                                                ref={composerRef}
                                                placeholder='Ask Archon to inspect or modify your project...'
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={handleComposerKeyDown}
                                                disabled={isStreaming || previewLoading || isApplyingPreview || createSession.isPending || !activeSessionId}
                                                rows={1}
                                                className='max-h-[180px] min-h-[40px] flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70'
                                            />
                                            <Button
                                                type='submit'
                                                size='icon'
                                                className='h-10 w-10 shrink-0'
                                                disabled={isStreaming || previewLoading || isApplyingPreview || createSession.isPending || !input.trim() || !activeSessionId}
                                            >
                                                {isStreaming || previewLoading || isApplyingPreview || createSession.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />}
                                            </Button>
                                        </div>
                                        <div className='px-1 text-[11px] text-muted-foreground'>
                                            Press <span className='font-medium'>Enter</span> to send, <span className='font-medium'>Shift+Enter</span> for a new line.
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className='flex min-h-0 flex-1 flex-col'>
                            <CardHeader className='space-y-3 border-b pb-3 pt-3'>
                                <div className='flex items-center justify-between gap-3'>
                                    <div>
                                        <CardTitle className='flex items-center gap-2 text-base'>
                                            <MessageSquare className='h-4 w-4 text-primary' /> Project chat history
                                        </CardTitle>
                                        <p className='mt-1 text-xs text-muted-foreground'>Only chats from this project appear here.</p>
                                    </div>
                                    <Button
                                        type='button'
                                        size='sm'
                                        className='h-8 gap-1 text-xs'
                                        onClick={handleCreateNewSession}
                                        disabled={createSession.isPending}
                                    >
                                        {createSession.isPending ? <Loader2 className='h-3 w-3 animate-spin' /> : <Plus className='h-3 w-3' />}
                                        New chat
                                    </Button>
                                </div>

                                <div className='relative'>
                                    <Search className='pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
                                    <input
                                        ref={sessionSearchRef}
                                        value={sessionSearch}
                                        onChange={(e) => setSessionSearch(e.target.value)}
                                        placeholder='Search this project’s chats...'
                                        className='h-9 w-full rounded-md border bg-background pl-7 pr-2 text-sm'
                                    />
                                </div>

                                {sessionsError ? (
                                    <p className='text-xs text-destructive'>Session sync failed. Existing chats are still accessible if already loaded.</p>
                                ) : null}
                            </CardHeader>

                            <ScrollArea className='min-w-0 flex-1'>
                                <div className='space-y-2 p-3'>
                                    {sessionsLoading ? (
                                        <div className='flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground'>
                                            <Loader2 className='h-3.5 w-3.5 animate-spin' /> Loading chats...
                                        </div>
                                    ) : null}
                                    {!sessionsLoading && filteredSessions.length === 0 ? (
                                        <div className='rounded-md border border-dashed p-4 text-sm text-muted-foreground'>
                                            No chats yet. Create one to start.
                                        </div>
                                    ) : null}

                                    {filteredSessions.map((session) => {
                                        const isActive = session.id === activeSessionId
                                        return (
                                            <div
                                                key={session.id}
                                                role='button'
                                                tabIndex={0}
                                                onClick={() => openSession(session.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault()
                                                        openSession(session.id)
                                                    }
                                                }}
                                                className={`w-full cursor-pointer rounded-md border px-3 py-3 text-left transition-colors ${isActive ? 'border-primary/50 bg-primary/10' : 'border-transparent hover:border-border hover:bg-muted/50'}`}
                                            >
                                                <div className='flex items-start justify-between gap-2'>
                                                    <div className='min-w-0'>
                                                        <div className='truncate text-sm font-medium'>
                                                            {session.title || 'Untitled chat'}
                                                        </div>
                                                        <div className='mt-1 line-clamp-2 text-xs text-muted-foreground'>
                                                            {session.last_message_preview || 'No messages yet'}
                                                        </div>
                                                        <div className='mt-1 text-[11px] text-muted-foreground'>
                                                            {session.last_message_at
                                                                ? formatDistanceToNow(new Date(session.last_message_at), { addSuffix: true })
                                                                : formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type='button'
                                                        className={`mt-0.5 rounded p-1 ${session.is_pinned ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            void handlePinSession(session.id, !session.is_pinned)
                                                        }}
                                                        title={session.is_pinned ? 'Unpin chat' : 'Pin chat'}
                                                    >
                                                        <Pin className='h-3.5 w-3.5' />
                                                    </button>
                                                </div>
                                                <div className='mt-2 flex items-center gap-1'>
                                                    <button
                                                        type='button'
                                                        className='rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            void handleRenameSession(session.id, session.title)
                                                        }}
                                                        title='Rename'
                                                        disabled={isSessionActionPending}
                                                    >
                                                        <Pencil className='h-3 w-3' />
                                                    </button>
                                                    <button
                                                        type='button'
                                                        className='rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            void handleArchiveSession(session.id, !Boolean(session.metadata?.archived))
                                                        }}
                                                        title={session.metadata?.archived ? 'Unarchive' : 'Archive'}
                                                        disabled={isSessionActionPending}
                                                    >
                                                        <Archive className='h-3 w-3' />
                                                    </button>
                                                    <button
                                                        type='button'
                                                        className='rounded p-1 text-destructive hover:bg-destructive/10'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            void handleDeleteSession(session.id)
                                                        }}
                                                        title='Delete'
                                                        disabled={isSessionActionPending}
                                                    >
                                                        <Trash2 className='h-3 w-3' />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </section>
                    )}
                </CardContent>
            </Card >
            <Dialog open={isPreviewOpen} onOpenChange={(open) => {
                if (!open) {
                    handleCancelPreview()
                }
            }}>
                <DialogContent className='max-h-[85vh] max-w-5xl overflow-hidden p-0'>
                    <DialogHeader className='border-b px-6 py-4'>
                        <DialogTitle>Review Proposed Changes</DialogTitle>
                        <DialogDescription>
                            Preview and approve the exact file diffs before applying them to your workspace.
                        </DialogDescription>
                    </DialogHeader>

                    <div className='grid min-h-0 grid-cols-1 lg:grid-cols-[260px_1fr]'>
                        <div className='border-b p-3 lg:border-b-0 lg:border-r'>
                            <div className='mb-2 text-xs font-semibold text-muted-foreground'>Files</div>
                            <ScrollArea className='h-[50vh]'>
                                <div className='space-y-1 pr-2'>
                                    {hasPreviewFiles ? previewFiles.map((item) => (
                                        <div
                                            key={item.path}
                                            role='button'
                                            tabIndex={0}
                                            className={`w-full rounded-md border px-2 py-2 text-left text-xs ${selectedPreviewPath === item.path ? 'border-primary/60 bg-primary/10' : 'border-transparent hover:border-border hover:bg-muted/50'}`}
                                            onClick={() => setSelectedPreviewPath(item.path)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault()
                                                    setSelectedPreviewPath(item.path)
                                                }
                                            }}
                                        >
                                            <div className='flex items-center justify-between gap-2'>
                                                <div className='truncate font-mono'>{item.path}</div>
                                                <div className='flex items-center gap-1'>
                                                    <button
                                                        type='button'
                                                        className={`rounded p-1 ${selectedPreviewPaths[item.path] !== false ? 'text-green-600' : 'text-muted-foreground hover:text-foreground'}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setSelectedPreviewPaths((prev) => ({ ...prev, [item.path]: true }))
                                                        }}
                                                        title='Accept file'
                                                    >
                                                        <Check className='h-3 w-3' />
                                                    </button>
                                                    <button
                                                        type='button'
                                                        className={`rounded p-1 ${selectedPreviewPaths[item.path] === false ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setSelectedPreviewPaths((prev) => ({ ...prev, [item.path]: false }))
                                                        }}
                                                        title='Reject file'
                                                    >
                                                        <X className='h-3 w-3' />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className='mt-1 text-[10px] text-muted-foreground'>
                                                {item.exists ? 'Modify' : 'Create'} | {`${item.old_size} -> ${item.new_size} chars`} |
                                                <span className='text-green-600'> +{item.added_lines || 0}</span>
                                                <span className='text-destructive'> -{item.removed_lines || 0}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className='rounded-md border border-dashed p-3 text-xs text-muted-foreground'>
                                            No file diffs were returned. Ask for explicit file changes, or try the request again with the exact files to edit.
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        <div className='flex min-h-0 flex-col'>
                            <div className='border-b px-4 py-2 text-sm'>
                                <div className='font-medium'>{previewResponse?.summary || 'Change preview'}</div>
                                {applyConflicts.length > 0 ? (
                                    <div className='mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive'>
                                        Conflict detected in {applyConflicts.length} file(s). Refresh preview to continue.
                                        <div className='mt-1 space-y-1'>
                                            {applyConflicts.map((conflict) => (
                                                <div key={conflict.path} className='font-mono text-[10px]'>
                                                    {conflict.path}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            <ScrollArea className='h-[50vh]'>
                                <pre className='overflow-x-auto whitespace-pre-wrap px-4 py-3 font-mono text-xs'>
                                    {hasPreviewFiles
                                        ? (previewResponse?.preview?.find((item) => item.path === selectedPreviewPath)?.diff || 'No diff selected.')
                                        : (previewResponse?.raw_response || 'No diffs were generated.')}
                                </pre>
                            </ScrollArea>
                        </div>
                    </div>

                    <DialogFooter className='border-t px-6 py-3'>
                        <div className='mr-auto text-xs text-muted-foreground'>
                            {Object.values(selectedPreviewPaths).filter((v) => v !== false).length} file(s) selected
                        </div>
                        <Button variant='outline' onClick={handleCancelPreview} disabled={isApplyingPreview}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleApplyPreview}
                            disabled={isApplyingPreview || !hasPreviewFiles || Object.values(selectedPreviewPaths).filter((v) => v !== false).length === 0}
                        >
                            {isApplyingPreview ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                            Apply Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
