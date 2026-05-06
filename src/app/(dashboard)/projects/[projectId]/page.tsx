'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import {
  Loader2,
  GitBranch,
  FileText,
  BrainCircuit,
  Database,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { projectService } from '@/services/project.service'
import { contextService } from '@/services/context.service'
import { agentService } from '@/services/agent.service'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileExplorer } from '@/components/projects/code/file-explorer' // Import FileExplorer
import { PlanningView } from '@/components/projects/planning/planning-view' // Import PlanningView
import { AgentsView } from '@/components/projects/agents/agents-view' // Import AgentsView
import { ProjectChat } from '@/components/project-chat' // Import ProjectChat
import { ProjectMemory } from '@/components/project-memory' // Import ProjectMemory
import { ProjectSettingsDialog } from '@/components/projects/project-settings-dialog'
import { MessageFormatter } from '@/components/chat/message-formatter'

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').trim()
}

function collectPathLikeStrings(value: any, keyHint = ''): string[] {
  if (value == null) return []

  if (typeof value === 'string') {
    const candidate = normalizePath(value)
    const keyLooksFileish = /(file|path|target|source|output|artifact)/i.test(keyHint)
    const valueLooksPath = /[\\/]/.test(candidate) || /\.[a-z0-9]{1,8}$/i.test(candidate)
    if (candidate && candidate.length < 220 && (keyLooksFileish || valueLooksPath)) {
      return [candidate]
    }
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectPathLikeStrings(entry, keyHint))
  }

  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => collectPathLikeStrings(v, k))
  }

  return []
}

export default function ProjectDetailsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('overview')
  const [agentFocus, setAgentFocus] = useState<{ sessionId?: string; executionId?: string }>({})
  const [activeFileContext, setActiveFileContext] = useState<{
    kind: 'codebase' | 'folder' | 'file'
    path?: string
    content?: string
  }>({ kind: 'codebase' })

  const updateUrlState = useCallback((nextTab: string, nextFocus: { sessionId?: string; executionId?: string }) => {
    const nextParams = new URLSearchParams(searchParams.toString())

    if (nextTab === 'overview') {
      nextParams.delete('tab')
    } else {
      nextParams.set('tab', nextTab)
    }

    if (nextTab === 'agents' && nextFocus.sessionId) {
      nextParams.set('session', nextFocus.sessionId)
    } else {
      nextParams.delete('session')
    }

    if (nextTab === 'agents' && nextFocus.executionId) {
      nextParams.set('execution', nextFocus.executionId)
    } else {
      nextParams.delete('execution')
    }

    const nextQuery = nextParams.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  useEffect(() => {
    const validTabs = new Set(['overview', 'planning', 'code', 'agents', 'memory'])
    const tabFromUrl = searchParams.get('tab')
    const sessionFromUrl = searchParams.get('session') || undefined
    const executionFromUrl = searchParams.get('execution') || undefined

    const resolvedTab = validTabs.has(tabFromUrl || '')
      ? (tabFromUrl as string)
      : (sessionFromUrl || executionFromUrl ? 'agents' : 'overview')

    setActiveTab((prev) => (prev === resolvedTab ? prev : resolvedTab))

    const nextFocus = resolvedTab === 'agents'
      ? { sessionId: sessionFromUrl, executionId: executionFromUrl }
      : {}

    setAgentFocus((prev) => {
      const unchanged = prev.sessionId === nextFocus.sessionId && prev.executionId === nextFocus.executionId
      return unchanged ? prev : nextFocus
    })
  }, [searchParams])

  const handleTabChange = (nextTab: string) => {
    const nextFocus = nextTab === 'agents' ? agentFocus : {}
    setActiveTab(nextTab)
    if (nextTab !== 'agents') {
      setAgentFocus({})
    }
    updateUrlState(nextTab, nextFocus)
  }

  const focusAgentExecution = (sessionId: string, executionId: string) => {
    const nextFocus = { sessionId, executionId }
    setAgentFocus(nextFocus)
    setActiveTab('agents')
    updateUrlState('agents', nextFocus)
  }

  const handleAgentFocusChange = (nextFocus: { sessionId?: string; executionId?: string }) => {
    setAgentFocus(nextFocus)
    updateUrlState('agents', nextFocus)
  }

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled: !!projectId,
  })

  const { data: stats } = useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: () => projectService.getProjectStats(projectId),
    enabled: !!projectId,
  })

  const { data: ideTree } = useQuery({
    queryKey: ['ide-tree-count', projectId],
    queryFn: () => contextService.getIDETree(projectId),
    enabled: !!projectId,
    retry: false,
  })

  const { data: agentSessions } = useQuery({
    queryKey: ['agent-session-summary', projectId],
    queryFn: () => agentService.getSessions(projectId),
    enabled: !!projectId,
  })

  const { data: recentTelemetry } = useQuery({
    queryKey: ['recent-execution-telemetry', projectId, agentSessions?.length || 0],
    enabled: !!projectId && !!agentSessions && agentSessions.length > 0,
    queryFn: async () => {
      const recentSessions = [...(agentSessions || [])]
        .sort((a: any, b: any) => {
          const aTime = new Date(a.updated_at || a.created_at).getTime()
          const bTime = new Date(b.updated_at || b.created_at).getTime()
          return bTime - aTime
        })
        .slice(0, 3)

      const executionGroups = await Promise.all(
        recentSessions.map(async (session: any) => {
          const executions = await agentService.getExecutions(session.id)
          return (executions || []).map((execution: any) => ({
            ...execution,
            _sessionId: session.id,
            _sessionName: session.session_name,
            _sessionStatus: session.status,
          }))
        })
      )

      const executions = executionGroups
        .flat()
        .sort((a: any, b: any) => {
          const aTime = new Date(a.created_at || a.updated_at).getTime()
          const bTime = new Date(b.created_at || b.updated_at).getTime()
          return bTime - aTime
        })

      const touchedFiles = new Map<string, { path: string; at: string; source: string }>()

      executions.forEach((execution: any) => {
        const executionAt = execution.created_at || execution.updated_at || new Date().toISOString()

        collectPathLikeStrings(execution.output_data, 'output_data').forEach((path) => {
          if (!touchedFiles.has(path)) {
            touchedFiles.set(path, {
              path,
              at: executionAt,
              source: execution.step_name || execution.agent_type || 'execution',
            })
          }
        })

          ; (execution.tool_calls || []).forEach((toolCall: any) => {
            const fromParams = collectPathLikeStrings(toolCall.parameters, 'parameters')
            const fromResult = collectPathLikeStrings(toolCall.result, 'result')
              ;[...fromParams, ...fromResult].forEach((path) => {
                if (!touchedFiles.has(path)) {
                  touchedFiles.set(path, {
                    path,
                    at: toolCall.created_at || executionAt,
                    source: toolCall.tool_name || 'tool',
                  })
                }
              })
          })
      })

      return {
        recentExecutions: executions.slice(0, 5),
        touchedFiles: Array.from(touchedFiles.values()).slice(0, 6),
      }
    },
  })

  const initIDERepo = useMutation({
    mutationFn: () => contextService.initIDERepo(projectId),
    onSuccess: () => {
      toast.success('IDE repository initialized')
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['ide-tree-count', projectId] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to initialize IDE repository')
    },
  })

  const fileCount = ideTree?.nodes?.filter((n: any) => n.type === 'file').length || 0
  const folderCount = ideTree?.nodes?.filter((n: any) => n.type === 'folder').length || 0
  const activeAgentCount = (agentSessions || []).filter((s: any) => s.status === 'active').length
  const failedAgentCount = (agentSessions || []).filter((s: any) => s.status === 'failed').length
  const pausedAgentCount = (agentSessions || []).filter((s: any) => s.status === 'paused').length
  const repoReady = !!project?.repository_path
  const recentTouchedFiles = recentTelemetry?.touchedFiles || []
  const recentExecutions = recentTelemetry?.recentExecutions || []
  if (isLoading || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
              {project.status}
            </Badge>
            <span className="text-muted-foreground text-sm">
              Last updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <ProjectSettingsDialog project={project} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="code">IDE Workspace</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Files Tracked
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fileCount}</div>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {folderCount} folders in IDE workspace
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Lines
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{project.repository_path ? 'Ready' : 'Not Init'}</div>
                {!project.repository_path && (
                  <Button
                    size='sm'
                    className='mt-2 h-7 text-xs'
                    onClick={() => initIDERepo.mutate()}
                    disabled={initIDERepo.isPending}
                  >
                    {initIDERepo.isPending ? <Loader2 className='mr-1 h-3 w-3 animate-spin' /> : null}
                    Initialize Repo
                  </Button>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Planning Status</CardTitle>
                <GitBranch className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">In Progress</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Agents
                </CardTitle>
                <BrainCircuit className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeAgentCount}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.settings?.idea_workflow?.original_prompt && project.settings.idea_workflow.original_prompt.trim() !== (project.description || '').trim() && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Original Idea</h4>
                      <div className="mt-1 text-sm leading-6">
                        <MessageFormatter content={project.settings.idea_workflow.original_prompt} />
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                    <div className="mt-1 text-sm leading-6">
                      <MessageFormatter content={project.description || 'No description'} />
                    </div>
                  </div>
                  {project.settings?.idea_workflow?.refined_prompt && project.settings.idea_workflow.refined_prompt.trim() !== (project.description || '').trim() && project.settings.idea_workflow.refined_prompt.trim() !== (project.settings.idea_workflow.original_prompt || '').trim() && (
                    <div className='rounded-md border bg-muted/20 p-3'>
                      <h4 className='mb-2 flex items-center text-sm font-medium text-muted-foreground'>
                        <Sparkles className='mr-2 h-4 w-4 text-primary' />
                        Refined Project Brief
                      </h4>
                      <div className='text-sm leading-6'>
                        <MessageFormatter content={project.settings.idea_workflow.refined_prompt} />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Language</h4>
                      <p className="mt-1">{project.language || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Framework</h4>
                      <p className="mt-1">{project.framework || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Repository Path</h4>
                    <p className="mt-1 font-mono text-sm bg-muted p-2 rounded">{project.repository_path || 'Not set'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Workflow Health</CardTitle>
                <CardDescription>
                  Live status from IDE and recent agent execution.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Repository</span>
                    <span className='inline-flex items-center gap-1 font-medium'>
                      {repoReady ? <CheckCircle2 className='h-3.5 w-3.5 text-green-600' /> : <AlertTriangle className='h-3.5 w-3.5 text-amber-600' />}
                      {repoReady ? 'Ready' : 'Needs Init'}
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Agents</span>
                    <span className='font-medium'>{activeAgentCount} active, {pausedAgentCount} paused</span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Failures</span>
                    <span className={`font-medium ${failedAgentCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {failedAgentCount > 0 ? `${failedAgentCount} require attention` : 'No failed sessions'}
                    </span>
                  </div>
                </div>

                <div className='space-y-2'>
                  <h4 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                    Latest Modified Files
                  </h4>
                  {recentTouchedFiles.length > 0 ? (
                    <div className='space-y-2'>
                      {recentTouchedFiles.map((entry: any, index: number) => (
                        <div key={`${entry.path}-${index}`} className='rounded border bg-muted/20 p-2'>
                          <div className='truncate font-mono text-xs'>{entry.path}</div>
                          <div className='mt-1 flex items-center justify-between text-[11px] text-muted-foreground'>
                            <span className='truncate'>{entry.source}</span>
                            <span>{formatDistanceToNow(new Date(entry.at), { addSuffix: true })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm text-muted-foreground'>No file changes captured yet from recent executions.</p>
                  )}
                </div>

                <div className='space-y-2'>
                  <h4 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Recent Steps</h4>
                  {recentExecutions.length > 0 ? (
                    <div className='space-y-2'>
                      {recentExecutions.map((execution: any) => (
                        <button
                          key={execution.id}
                          type='button'
                          className='flex w-full items-center justify-between rounded border px-2 py-1.5 text-xs transition-colors hover:bg-muted/30'
                          onClick={() => {
                            if (!execution._sessionId) return
                            focusAgentExecution(execution._sessionId, execution.id)
                          }}
                        >
                          <div className='truncate pr-2 text-left'>
                            {execution.step_name || execution._sessionName || execution.agent_type}
                          </div>
                          <Badge variant={execution.status === 'completed' ? 'default' : execution.status === 'failed' ? 'destructive' : 'secondary'}>
                            {execution.status}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm text-muted-foreground'>No execution steps yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="planning">
          <PlanningView projectId={projectId} />
        </TabsContent>
        <TabsContent value="code">
          <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]'>
            <FileExplorer projectId={projectId} onActiveFileChange={setActiveFileContext} />
            <ProjectChat projectId={projectId} className='h-[700px]' activeContext={activeFileContext} />
          </div>
        </TabsContent>
        <TabsContent value="agents">
          <AgentsView
            projectId={projectId}
            initialSessionId={agentFocus.sessionId}
            highlightedExecutionId={agentFocus.executionId}
            onSessionFocusChange={handleAgentFocusChange}
          />
        </TabsContent>
        <TabsContent value="memory">
          <ProjectMemory projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
