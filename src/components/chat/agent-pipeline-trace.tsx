import { Loader2, Sparkles, Bot, Brain, GitBranch, Code2 } from 'lucide-react'

export interface AgentTraceItem {
    agent: string
    content: string
    intent?: string
    confidence?: number
}

interface AgentPipelineTraceProps {
    trace: AgentTraceItem[]
    isActive?: boolean
    route?: string
    intent?: string
    llmProvider?: string
    llmModel?: string
}

const AGENT_ICONS: Record<string, typeof Bot> = {
    orchestrator: Brain,
    planner: GitBranch,
    coder: Code2,
    memory: Sparkles,
    system: Bot,
}

export function AgentPipelineTrace({
    trace,
    isActive = false,
    route,
    intent,
    llmProvider,
    llmModel,
}: AgentPipelineTraceProps) {
    if (!trace.length && !route && !llmProvider) {
        return null
    }

    return (
        <div className='mb-3 space-y-2.5 rounded-lg border-2 border-primary/40 bg-primary/10 p-3 text-xs shadow-sm'>
            <div className='flex flex-wrap items-center gap-2'>
                <div className='flex items-center gap-1.5 text-sm font-bold text-primary'>
                    <Bot className='h-4 w-4' />
                    Agent pipeline
                    {isActive ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : null}
                </div>
                {route ? (
                    <span className='rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground'>
                        {route}
                    </span>
                ) : null}
                {intent ? (
                    <span className='rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground'>
                        {intent.replace(/_/g, ' ')}
                    </span>
                ) : null}
                {llmProvider ? (
                    <span className='ml-auto rounded-full bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground'>
                        LLM: {llmProvider}{llmModel ? ` / ${llmModel}` : ''}
                    </span>
                ) : null}
            </div>

            {trace.length > 0 ? (
                <div className='space-y-2 border-t border-primary/20 pt-2'>
                    {trace.map((item, index) => {
                        const isLast = index === trace.length - 1
                        const showSpinner = isActive && isLast
                        const Icon = AGENT_ICONS[item.agent.toLowerCase()] || Sparkles
                        return (
                            <div key={`${item.agent}-${index}`} className='flex items-start gap-2.5 text-foreground/90'>
                                <div className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20'>
                                    {showSpinner ? (
                                        <Loader2 className='h-3 w-3 animate-spin text-primary' />
                                    ) : (
                                        <Icon className='h-3 w-3 text-primary' />
                                    )}
                                </div>
                                <span className='min-w-0 [overflow-wrap:anywhere]'>
                                    <span className='font-semibold capitalize text-primary'>{item.agent}</span>
                                    {': '}
                                    {item.content}
                                </span>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <p className='text-muted-foreground'>Waiting for agent status…</p>
            )}
        </div>
    )
}

export function extractAgentTrace(metadata: any): AgentTraceItem[] {
    if (!metadata) return []
    if (!metadata.agentic && !metadata.agent_trace) {
        return []
    }
    if (!Array.isArray(metadata.agent_trace)) {
        if (metadata.route) {
            return [{ agent: 'orchestrator', content: `Route: ${metadata.route}` }]
        }
        return []
    }
    return metadata.agent_trace
        .filter((item: any) => item && item.agent && item.content)
        .map((item: any) => ({
            agent: String(item.agent),
            content: String(item.content),
            intent: item.intent,
            confidence: item.confidence,
        }))
}
