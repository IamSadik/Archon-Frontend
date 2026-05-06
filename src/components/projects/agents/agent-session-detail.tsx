'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft,
    ChevronRight,
    ChevronDown,
    Loader2,
    PlayCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { agentService } from '@/services/agent.service'
import { planningService } from '@/services/planning.service'
import { AgentSession, AgentExecution, ToolCall } from '@/types'
import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'
import { MessageFormatter } from '@/components/chat/message-formatter'

interface AgentSessionDetailProps {
    session: AgentSession
    onBack: () => void
    highlightedExecutionId?: string
}

function ToolCallItem({ toolCall }: { toolCall: ToolCall }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="border rounded-md bg-muted/30 overflow-hidden text-sm">
            <div
                className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Badge variant="secondary" className="text-[10px] font-mono">TOOL</Badge>
                <span className="font-mono text-xs">{toolCall.tool_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                    {toolCall.created_at
                        ? formatDistanceToNow(new Date(toolCall.created_at), { addSuffix: true })
                        : ''}
                </span>
            </div>
            {isOpen && (
                <div className="p-2 border-t bg-muted/10 space-y-2">
                    <div>
                        <div className="text-[10px] uppercase text-muted-foreground mb-1">Parameters</div>
                        <pre className="bg-background p-2 rounded text-xs font-mono overflow-x-auto">
                            {JSON.stringify(toolCall.parameters, null, 2)}
                        </pre>
                    </div>
                    {toolCall.result && (
                        <div>
                            <div className="text-[10px] uppercase text-muted-foreground mb-1">Result</div>
                            <pre className="bg-background p-2 rounded text-xs font-mono overflow-x-auto text-muted-foreground">
                                {typeof toolCall.result === 'object' ? JSON.stringify(toolCall.result, null, 2) : toolCall.result}
                            </pre>
                        </div>
                    )}
                    {toolCall.error_message && (
                        <div>
                            <div className="text-[10px] uppercase text-destructive mb-1">Error</div>
                            <pre className="bg-destructive/10 text-destructive p-2 rounded text-xs font-mono overflow-x-auto">
                                {toolCall.error_message}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function ExecutionItem({ execution, index, isHighlighted }: { execution: AgentExecution, index: number, isHighlighted?: boolean }) {
    return (
        <div
            id={`execution-${execution.id}`}
            className={`relative pl-6 pb-6 border-l-2 last:border-0 last:pb-0 ${isHighlighted ? 'border-primary rounded-md bg-primary/5' : 'border-muted'}`}
        >
            <div className="absolute top-0 -left-[9px] w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary" />
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Step {index + 1}</span>
                    <Badge variant={execution.status === 'completed' ? 'default' : 'outline'}>
                        {execution.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(execution.created_at), { addSuffix: true })}
                    </span>
                    {isHighlighted && <Badge variant="secondary">Focused</Badge>}
                </div>

                {execution.input_data && (
                    <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                        <span className="font-semibold text-xs uppercase block mb-1">Input Context</span>
                        <MessageFormatter content={typeof execution.input_data === 'string' ? execution.input_data : JSON.stringify(execution.input_data)} />
                    </div>
                )}

                {execution.tool_calls && execution.tool_calls.length > 0 && (
                    <div className="space-y-2">
                        {execution.tool_calls.map((tc) => (
                            <ToolCallItem key={tc.id} toolCall={tc} />
                        ))}
                    </div>
                )}

                {execution.output_data && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded p-3 text-sm">
                        <span className="font-semibold text-xs uppercase text-green-600 mb-1 block">Output</span>
                        <MessageFormatter content={typeof execution.output_data === 'string' ? execution.output_data : JSON.stringify(execution.output_data)} />
                    </div>
                )}
            </div>
        </div>
    )
}

export function AgentSessionDetail({ session, onBack, highlightedExecutionId }: AgentSessionDetailProps) {
    const queryClient = useQueryClient()
    const [localStatus, setLocalStatus] = useState(session.status)

    const { data: executions, isLoading } = useQuery({
        queryKey: ['agent-executions', session.id],
        queryFn: () => agentService.getExecutions(session.id),
        refetchInterval: localStatus === 'active' ? 2000 : false
    })

    const { data: progress } = useQuery({
        queryKey: ['agent-progress', session.id],
        queryFn: () => agentService.getSessionProgress(session.id),
        refetchInterval: localStatus === 'active' ? 2000 : 10000,
    })

    const cancelSession = useMutation({
        mutationFn: () => agentService.cancelSession(session.id),
        onSuccess: () => {
            setLocalStatus('cancelled')
            queryClient.invalidateQueries({ queryKey: ['agent-sessions', session.project] })
            queryClient.invalidateQueries({ queryKey: ['agent-executions', session.id] })
            queryClient.invalidateQueries({ queryKey: ['agent-progress', session.id] })
            toast.success('Session stopped')
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || error?.response?.data?.detail || 'Failed to stop session')
        }
    })

    const runSession = useMutation({
        mutationFn: async () => {
            if (localStatus === 'failed') {
                await agentService.resetSession(session.id)
                return agentService.startExecution(session.id)
            }
            if (localStatus === 'paused') {
                return agentService.resumeSession(session.id)
            }
            return agentService.startExecution(session.id)
        },
        onMutate: async () => {
            setLocalStatus('active')
            await queryClient.cancelQueries({ queryKey: ['agent-sessions', session.project] })
            queryClient.setQueryData(['agent-sessions', session.project], (old: any) => {
                if (!Array.isArray(old)) return old
                return old.map((item: any) => item.id === session.id ? { ...item, status: 'active' } : item)
            })
            queryClient.setQueryData(['agent-progress', session.id], (old: any) => ({ ...(old || {}), status: 'active' }))
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['agent-sessions', session.project] })
            queryClient.invalidateQueries({ queryKey: ['agent-executions', session.id] })
            queryClient.invalidateQueries({ queryKey: ['agent-progress', session.id] })

            try {
                const latestProgress = await queryClient.fetchQuery({
                    queryKey: ['agent-progress', session.id],
                    queryFn: () => agentService.getSessionProgress(session.id),
                }) as any
                if (latestProgress?.status) {
                    setLocalStatus(latestProgress.status)
                }
            } catch {
                // Keep existing status if progress refresh fails.
            }

            toast.success('Execution dispatched')
        },
        onError: (error: any) => {
            setLocalStatus(session.status)
            queryClient.invalidateQueries({ queryKey: ['agent-sessions', session.project] })
            queryClient.invalidateQueries({ queryKey: ['agent-progress', session.id] })
            toast.error(error?.response?.data?.error || error?.response?.data?.detail || 'Failed to start session')
        }
    })

    useEffect(() => {
        setLocalStatus(session.status)
    }, [session.id, session.status])

    useEffect(() => {
        if (progress?.status) {
            setLocalStatus(progress.status)
            if (['completed', 'failed', 'cancelled'].includes(progress.status)) {
                queryClient.invalidateQueries({ queryKey: ['agent-sessions', session.project] })
            }
        }
    }, [progress?.status, queryClient, session.project])

    const backendLogs = useMemo(() => {
        const logEntries: Array<{
            id: string
            timestamp: string
            level: 'info' | 'warning' | 'error' | 'debug'
            message: string
            details?: any
        }> = []

        if (progress) {
            logEntries.push({
                id: `progress-${session.id}`,
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Progress: ${progress.completed_executions || 0}/${progress.total_executions || 0} executions completed`,
                details: progress,
            })
        }

        ; (executions || []).forEach((execution, index) => {
            logEntries.push({
                id: `execution-${execution.id}`,
                timestamp: execution.created_at,
                level: execution.status === 'failed' ? 'error' : execution.status === 'completed' ? 'info' : 'debug',
                message: `Step ${index + 1}: ${execution.step_name || execution.step_type || 'execution'} — ${execution.status}`,
                details: {
                    input_data: execution.input_data,
                    output_data: execution.output_data,
                    error_message: execution.error_message,
                    tool_calls: execution.tool_calls?.length || 0,
                    execution_time_ms: execution.execution_time_ms,
                },
            })

            if (execution.tool_calls && execution.tool_calls.length > 0) {
                execution.tool_calls.forEach((toolCall) => {
                    logEntries.push({
                        id: `tool-${toolCall.id}`,
                        timestamp: toolCall.created_at || execution.created_at,
                        level: toolCall.status === 'failed' ? 'error' : toolCall.status === 'completed' ? 'info' : 'debug',
                        message: `Tool: ${toolCall.tool_name} — ${toolCall.status || 'pending'}`,
                        details: {
                            tool_description: toolCall.tool_description,
                            parameters: toolCall.parameters,
                            result: toolCall.result,
                            error_message: toolCall.error_message,
                        },
                    })
                })
            }
        })

        return logEntries.slice().reverse().slice(0, 50)
    }, [executions, progress, session.id])

    useEffect(() => {
        if (!highlightedExecutionId || !executions || executions.length === 0) {
            return
        }

        const target = document.getElementById(`execution-${highlightedExecutionId}`)
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [highlightedExecutionId, executions])

    // Fetch linked feature if exists
    const { data: feature } = useQuery({
        queryKey: ['feature', session.feature],
        queryFn: () => planningService.getFeature(session.feature!),
        enabled: !!session.feature
    })

    return (
        <div className="flex flex-col h-[600px] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        {session.session_name}
                        <Badge variant="outline">{session.agent_type}</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">{session.goal}</p>
                    {feature && (
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">Linked Feature:</span>
                            <Badge variant="secondary" className="text-[10px] h-5 hover:bg-secondary/80">
                                {feature.name}
                            </Badge>
                        </div>
                    )}
                </div>
                <div className="ml-auto">
                    <div className='flex items-center gap-2'>
                        {localStatus !== 'active' && localStatus !== 'completed' && localStatus !== 'cancelled' && (
                            <Button
                                size='sm'
                                onClick={() => runSession.mutate()}
                                disabled={runSession.isPending}
                            >
                                {runSession.isPending ? (
                                    <>
                                        <Loader2 className='mr-2 h-3.5 w-3.5 animate-spin' />
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className='mr-2 h-3.5 w-3.5' />
                                        {localStatus === 'paused' ? 'Resume' : localStatus === 'failed' ? 'Retry' : 'Run'}
                                    </>
                                )}
                            </Button>
                        )}
                        {localStatus === 'active' && (
                            <Button
                                variant='destructive'
                                size='sm'
                                onClick={() => cancelSession.mutate()}
                                disabled={cancelSession.isPending}
                            >
                                {cancelSession.isPending ? 'Stopping...' : 'Stop'}
                            </Button>
                        )}
                        <Badge variant={localStatus === 'active' ? 'default' : 'secondary'} className="uppercase">
                            {localStatus}
                        </Badge>
                    </div>
                </div>
            </div>

            {progress && (
                <div className='rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground'>
                    <span>Executions: {progress.total_executions || 0}</span>
                    <span className='mx-2'>|</span>
                    <span>Completed: {progress.completed_executions || 0}</span>
                    <span className='mx-2'>|</span>
                    <span>Failures: {progress.failed_executions || 0}</span>
                </div>
            )}

            <div className='rounded-md border bg-background'>
                <div className='flex items-center justify-between border-b px-3 py-2'>
                    <div>
                        <div className='text-sm font-medium'>Live Backend Log</div>
                        <div className='text-xs text-muted-foreground'>Continuous agent execution events</div>
                    </div>
                    <Badge variant='outline'>{backendLogs.length} entries</Badge>
                </div>
                <div className='max-h-44 overflow-y-auto p-3 space-y-2 text-xs font-mono'>
                    {backendLogs.length > 0 ? backendLogs.map((entry) => (
                        <div key={entry.id} className='rounded border bg-muted/20 p-2'>
                            <div className='flex items-center gap-2'>
                                <Badge variant={entry.level === 'error' ? 'destructive' : entry.level === 'warning' ? 'secondary' : 'outline'} className='h-5 text-[10px] uppercase'>
                                    {entry.level}
                                </Badge>
                                <span className='text-muted-foreground'>{formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
                            </div>
                            <div className='mt-1 text-foreground'>{entry.message}</div>
                            {entry.details ? (
                                <pre className='mt-1 overflow-x-auto rounded bg-background p-2 text-[10px] text-muted-foreground'>
                                    {JSON.stringify(entry.details, null, 2)}
                                </pre>
                            ) : null}
                        </div>
                    )) : (
                        <div className='text-muted-foreground'>No backend log yet. Start the agent to stream events here.</div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading activity...</div>
                ) : executions && executions.length > 0 ? (
                    <div className="p-2">
                        {executions.map((execution, i) => (
                            <ExecutionItem
                                key={execution.id}
                                execution={execution}
                                index={i}
                                isHighlighted={execution.id === highlightedExecutionId}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-10 text-center text-muted-foreground">
                        No activity yet. Click &quot;Run&quot; to start the agent.
                        {localStatus === 'active' && (
                            <div className='mt-2 text-amber-600'>
                                Session is marked active but no execution records have started yet.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
