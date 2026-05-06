'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Bot,
    PlayCircle,
    Clock,
    Plus,
    Loader2,
    StopCircle,
    CheckCircle2,
    AlertOctagon,
    MoreHorizontal,
    Trash2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreateAgentDialog } from './create-agent-dialog'
import { AgentSessionDetail } from './agent-session-detail'
import { agentService } from '@/services/agent.service'
import { AgentSession } from '@/types'

interface AgentsViewProps {
    projectId: string
    initialSessionId?: string
    highlightedExecutionId?: string
    onSessionFocusChange?: (focus: { sessionId?: string; executionId?: string }) => void
}

export function AgentsView({ projectId, initialSessionId, highlightedExecutionId, onSessionFocusChange }: AgentsViewProps) {
    const [selectedSession, setSelectedSession] = useState<AgentSession | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [suppressedAutoSelectSessionId, setSuppressedAutoSelectSessionId] = useState<string | null>(null)
    const [suppressNextAutoSelect, setSuppressNextAutoSelect] = useState(false)
    const queryClient = useQueryClient()

    const { data: sessions, isLoading } = useQuery({
        queryKey: ['agent-sessions', projectId],
        queryFn: () => agentService.getSessions(projectId),
        refetchInterval: (query) => {
            const current = query.state.data as AgentSession[] | undefined
            const hasActiveSession = Array.isArray(current) && current.some((session) => session.status === 'active')
            return hasActiveSession ? 2000 : false
        },
    })

    useEffect(() => {
        if (!selectedSession || !sessions) {
            return
        }

        const updated = sessions.find((session) => session.id === selectedSession.id)
        if (updated && updated.status !== selectedSession.status) {
            setSelectedSession(updated)
        }
    }, [sessions, selectedSession])

    useEffect(() => {
        if (!initialSessionId || !highlightedExecutionId || !sessions || sessions.length === 0) {
            return
        }

        if (suppressNextAutoSelect) {
            setSuppressNextAutoSelect(false)
            return
        }

        if (suppressedAutoSelectSessionId && suppressedAutoSelectSessionId === initialSessionId) {
            return
        }

        const targetSession = sessions.find((session) => session.id === initialSessionId)
        if (targetSession) {
            setSelectedSession(targetSession)
            onSessionFocusChange?.({ sessionId: targetSession.id, executionId: highlightedExecutionId })
        }
    }, [highlightedExecutionId, initialSessionId, onSessionFocusChange, sessions, suppressedAutoSelectSessionId, suppressNextAutoSelect])

    useEffect(() => {
        if (!initialSessionId) {
            setSuppressedAutoSelectSessionId(null)
        }
    }, [initialSessionId])

    const openSessionDetails = (session: AgentSession) => {
        setSuppressedAutoSelectSessionId(null)
        setSelectedSession(session)
        onSessionFocusChange?.({ sessionId: session.id })
    }

    const markSessionActive = (sessionId: string) => {
        queryClient.setQueryData(['agent-sessions', projectId], (old: any) => {
            if (!Array.isArray(old)) return old
            return old.map((item: AgentSession) => item.id === sessionId ? { ...item, status: 'active' } : item)
        })
    }

    // Start/Resume Mutation with proper error handling
    const executeSession = useMutation({
        mutationFn: (sessionId: string) => agentService.startExecution(sessionId),
        onMutate: async (sessionId) => {
            markSessionActive(sessionId)
            await queryClient.cancelQueries({ queryKey: ['agent-sessions', projectId] })
        },
        onSuccess: (data, sessionId) => {
            toast.success('Agent execution started successfully!')
            queryClient.invalidateQueries({ queryKey: ['agent-sessions', projectId] })
            queryClient.invalidateQueries({ queryKey: ['agent-executions', sessionId] })
        },
        onError: (error: any) => {
            console.error('Execution start error:', error)

            // Check for rate limit errors
            const errorData = error?.response?.data
            const errorStr = JSON.stringify(errorData || {}).toLowerCase()

            let msg = 'Failed to start agent execution'

            if (errorStr.includes('rate limit') || errorStr.includes('429') || errorStr.includes('quota exceeded') || errorStr.includes('too many requests')) {
                msg = '⚠️ API Rate Limit Exceeded: Your Gemini free tier allows only 5 requests per minute. The agent needs more calls to complete. Please wait 60 seconds and try again, or upgrade your API key.'
            } else if (errorData?.detail) {
                msg = errorData.detail
            } else if (errorData?.error) {
                msg = errorData.error
            } else if (errorData?.message) {
                msg = errorData.message
            }

            toast.error(msg, { duration: 10000 })
        }
    })

    const resumeSession = useMutation({
        mutationFn: (sessionId: string) => agentService.resumeSession(sessionId),
        onMutate: async (sessionId) => {
            markSessionActive(sessionId)
            await queryClient.cancelQueries({ queryKey: ['agent-sessions', projectId] })
        },
        onSuccess: (_data, sessionId) => {
            toast.success('Session resumed')
            queryClient.invalidateQueries({ queryKey: ['agent-sessions', projectId] })
            queryClient.invalidateQueries({ queryKey: ['agent-executions', sessionId] })
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.error || error?.response?.data?.detail || 'Failed to resume session'
            toast.error(msg)
            queryClient.invalidateQueries({ queryKey: ['agent-sessions', projectId] })
        }
    })

    // Reset/Retry failed session
    const retrySession = useMutation({
        mutationFn: (sessionId: string) => agentService.resetSession(sessionId),
        onSuccess: (data, sessionId) => {
            toast.success('Session reset! Click Run to try again.')
            queryClient.invalidateQueries({ queryKey: ['agent-sessions', projectId] })
        },
        onError: (error: any) => {
            console.error('Reset error:', error)
            const msg = error?.response?.data?.detail || 'Failed to reset session'
            toast.error(msg)
        }
    })

    // Stop/cancel an active session
    const cancelSession = useMutation({
        mutationFn: (sessionId: string) => agentService.cancelSession(sessionId),
        onSuccess: (_data, sessionId) => {
            toast.success('Session stopped')
            queryClient.invalidateQueries({ queryKey: ['agent-sessions', projectId] })
            queryClient.invalidateQueries({ queryKey: ['agent-executions', sessionId] })
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.error || error?.response?.data?.detail || 'Failed to stop session'
            toast.error(msg)
        }
    })

    // Delete session
    const deleteSession = useMutation({
        mutationFn: (sessionId: string) => agentService.deleteSession(sessionId),
        onSuccess: (data) => {
            // Show detailed success message with deletion stats
            const executionsDeleted = data?.deleted?.executions_deleted || 0
            const toolCallsDeleted = data?.deleted?.tool_calls_deleted || 0

            if (executionsDeleted > 0 || toolCallsDeleted > 0) {
                toast.success(
                    `Session deleted successfully! (${executionsDeleted} executions, ${toolCallsDeleted} tool calls removed)`,
                    { duration: 5000 }
                )
            } else {
                toast.success('Agent session deleted successfully')
            }

            setDeleteConfirmId(null)
            queryClient.invalidateQueries({ queryKey: ['agent-sessions', projectId] })
        },
        onError: (error: any) => {
            console.error('Delete error:', error)
            console.error('Error response:', error?.response)
            console.error('Error data:', error?.response?.data)

            let msg = 'Failed to delete session'

            // Check if it's a server error
            if (error?.response?.status === 500) {
                msg = '⚠️ Server error while deleting session. This might be due to: \n• Running session (try stopping it first)\n• Database constraint issues\n• Backend service error\n\nCheck backend logs for details.'
            } else if (error?.response?.status === 404) {
                msg = 'Session not found. It may have been already deleted.'
                // Still invalidate cache in case
                queryClient.invalidateQueries({ queryKey: ['agent-sessions', projectId] })
            } else if (error?.response?.data?.detail) {
                msg = error.response.data.detail
            } else if (error?.response?.data?.error) {
                msg = error.response.data.error
            } else if (error?.response?.data?.message) {
                msg = error.response.data.message
            }

            toast.error(msg, { duration: 8000 })
            setDeleteConfirmId(null)
        }
    })

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />
            case 'failed': return <AlertOctagon className="h-4 w-4 text-red-500" />
            case 'paused': return <StopCircle className="h-4 w-4 text-orange-500" />
            default: return <Bot className="h-4 w-4" />
        }
    }

    // If a session is selected, show details view
    if (selectedSession) {
        // Pass a way to refresh the list 
        return (
            <AgentSessionDetail
                session={selectedSession}
                highlightedExecutionId={selectedSession.id === initialSessionId ? highlightedExecutionId : undefined}
                onBack={() => {
                    setSuppressedAutoSelectSessionId(selectedSession.id)
                    setSuppressNextAutoSelect(true)
                    setSelectedSession(null)
                    onSessionFocusChange?.({})
                    queryClient.invalidateQueries({ queryKey: ['agent-sessions', projectId] })
                }}
            />
        )
    }

    return (
        <div className='space-y-4'>
            <div className='flex justify-between items-center'>
                <div>
                    <h3 className='text-lg font-medium'>Active Agents</h3>
                    <p className='text-sm text-muted-foreground'>Manage autonomous agents for this project.</p>
                </div>
                <CreateAgentDialog
                    projectId={projectId}
                    trigger={
                        <Button>
                            <Plus className='mr-2 h-4 w-4' />
                            New Agent Task
                        </Button>
                    }
                    onSuccess={() => queryClient.invalidateQueries({ queryKey: ['agent-sessions', projectId] })}
                />
            </div>

            {isLoading ? (
                <div className='flex justify-center p-10'><Loader2 className='h-8 w-8 animate-spin text-muted-foreground' /></div>
            ) : sessions && sessions.length > 0 ? (
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {sessions.map((session) => (
                        <Card key={session.id} className='flex flex-col cursor-pointer transition-colors hover:bg-accent/50' onClick={() => openSessionDetails(session)}>
                            <CardHeader className='pb-2'>
                                <div className='flex justify-between items-start'>
                                    <div className='flex items-center gap-2'>
                                        {getStatusIcon(session.status)}
                                        <CardTitle className='text-base'>{session.session_name}</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Badge variant='outline' className='text-xs uppercase'>{session.agent_type}</Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirmId(session.id);
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription className='line-clamp-2 text-xs mt-1'>
                                    {session.goal}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className='pt-2 pb-2 flex-1'>
                                {/* Progress or last activity can go here */}
                                <div className='text-xs text-muted-foreground flex items-center mt-2'>
                                    <Clock className='mr-1 h-3 w-3' />
                                    Updated {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                                </div>
                            </CardContent>
                            <CardFooter className='pt-2 border-t bg-muted/10'>
                                <div className="flex w-full justify-between gap-2">
                                    <Button variant='ghost' size='sm' className='w-full text-xs' onClick={(e) => {
                                        e.stopPropagation();
                                        openSessionDetails(session);
                                    }}>
                                        View Details
                                    </Button>
                                    {session.status !== 'active' && session.status !== 'completed' && session.status !== 'cancelled' && (
                                        <Button
                                            variant='default'
                                            size='sm'
                                            className='w-full text-xs'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (session.status === 'paused') {
                                                    resumeSession.mutate(session.id)
                                                    return
                                                }

                                                if (session.status === 'failed') {
                                                    retrySession.mutate(session.id, {
                                                        onSuccess: () => executeSession.mutate(session.id)
                                                    })
                                                    return
                                                }

                                                executeSession.mutate(session.id);
                                            }}
                                            disabled={executeSession.isPending || resumeSession.isPending}
                                        >
                                            {executeSession.isPending || resumeSession.isPending ? (
                                                <>
                                                    <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                                                    Starting...
                                                </>
                                            ) : (
                                                <>
                                                    <PlayCircle className='mr-1 h-3 w-3' />
                                                    {session.status === 'paused' ? 'Resume' : session.status === 'failed' ? 'Retry' : 'Run'}
                                                </>
                                            )}
                                        </Button>
                                    )}
                                    {session.status === 'active' && (
                                        <Button
                                            variant='destructive'
                                            size='sm'
                                            className='w-full text-xs'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                cancelSession.mutate(session.id)
                                            }}
                                            disabled={cancelSession.isPending}
                                        >
                                            {cancelSession.isPending ? (
                                                <>
                                                    <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                                                    Stopping...
                                                </>
                                            ) : (
                                                <>
                                                    <StopCircle className='mr-1 h-3 w-3' />
                                                    Stop
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className='flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/10 text-center'>
                    <Bot className='h-12 w-12 text-muted-foreground mb-4 opacity-50' />
                    <h3 className='text-lg font-semibold'>No Active Agents</h3>
                    <p className='text-muted-foreground mb-4 text-sm max-w-sm'>
                        Start a new agent session to delegate tasks like coding, debugging, or research.
                    </p>
                    <CreateAgentDialog
                        projectId={projectId}
                        trigger={<Button>Create First Agent</Button>}
                        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['agent-sessions', projectId] })}
                    />
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirmId(null)}>
                    <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-2">Delete Agent Session?</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            This will permanently delete the agent session and all its execution history. This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteConfirmId(null)}
                                disabled={deleteSession.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => deleteSession.mutate(deleteConfirmId)}
                                disabled={deleteSession.isPending}
                            >
                                {deleteSession.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete Session
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
