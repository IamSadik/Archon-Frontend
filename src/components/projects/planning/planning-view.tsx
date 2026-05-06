'use client'

import { useState } from 'react'
import { Send, Sparkles, Loader2, GitBranch, Plus, Wand2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useCurrentUser } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { FeatureTreeItem } from './feature-tree'
import { Plan, Feature, Project } from '@/types'
import { FeatureDetailsSheet } from './feature-details-sheet'
import { AutonomousPlanDialog } from './autonomous-plan-dialog'
import { toast } from 'react-hot-toast'
import { usePlans, usePlanTree, useCreatePlan, useCreateFeature, useProcessPlanningMessage, useGenerateAutonomousPlan, useGenerateFromDescription, useDeletePlan } from '@/hooks/usePlanning'
import { useQuery } from '@tanstack/react-query'
import { projectService } from '@/services/project.service'

interface PlanningViewProps {
  projectId: string
}

export function PlanningView({ projectId }: PlanningViewProps) {
  const { data: user } = useCurrentUser()
  const [prompt, setPrompt] = useState('')
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<string>('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showManualItemDialog, setShowManualItemDialog] = useState(false)
  const [manualFeatureName, setManualFeatureName] = useState('')
  const [manualFeatureDescription, setManualFeatureDescription] = useState('')
  const [manualFeaturePriority, setManualFeaturePriority] = useState<number>(5)
  const [manualFeatureEffort, setManualFeatureEffort] = useState<'small' | 'medium' | 'large' | 'extra_large'>('medium')

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled: !!projectId,
  })

  // Fetch plans for this project
  const { data: plansData, isLoading: isLoadingPlans } = usePlans()

  // Ensure plans is always an array
  const plans = Array.isArray(plansData) ? plansData : [];

  const projectPlans = plans.filter((p: Plan) => p.project === projectId)
  const currentPlan = projectPlans?.[0]

  // Fetch feature tree if we have a plan
  const { data: features, isLoading: isLoadingTree } = usePlanTree(currentPlan?.id || '')
  const rootFeatures = Array.isArray(features) ? [...features].sort((a: Feature, b: Feature) => {
    const orderA = a.order_index ?? 0
    const orderB = b.order_index ?? 0
    if (orderA !== orderB) return orderA - orderB
    return (b.priority ?? 0) - (a.priority ?? 0)
  }) : []
  const executionTrail = rootFeatures.slice(0, 4).map((feature: Feature) => feature.name).join(' → ')

  // Mutation to create a plan
  const createPlanMutation = useCreatePlan()
  const createFeatureMutation = useCreateFeature()

  // Mutation to delete a plan
  const deletePlanMutation = useDeletePlan()

  // Mutation to process AI message
  const processMessageMutation = useProcessPlanningMessage()
  const isGenerating = processMessageMutation.isPending

  // Autonomous plan generation
  const generateAutonomousPlan = useGenerateAutonomousPlan()
  const generateFromDescription = useGenerateFromDescription()

  const handleGenerateCompletePlan = () => {
    if (!project || !project.description) {
      toast.error('Project must have a description to generate a plan')
      return
    }

    if (!currentPlan) {
      toast.error('Please initialize a plan first')
      return
    }

    // Show initial status
    setGenerationStatus('Analyzing project description...')

    // Simulate progress updates (since we don't have real-time backend updates)
    const statusUpdates = [
      { delay: 2000, message: '🤖 AI is analyzing requirements...' },
      { delay: 5000, message: '📋 Breaking down into features...' },
      { delay: 8000, message: '🔨 Creating feature hierarchy...' },
      { delay: 12000, message: '✅ Generating subtasks...' },
      { delay: 15000, message: '🎯 Almost done, finalizing plan...' },
    ]

    const timeouts: NodeJS.Timeout[] = []
    statusUpdates.forEach(({ delay, message }) => {
      const timeout = setTimeout(() => setGenerationStatus(message), delay)
      timeouts.push(timeout)
    })

    // Use generateFromDescription for existing plans
    generateFromDescription.mutate({
      planId: currentPlan.id,
      description: project.description,
      maxFeatures: 15,
      includeTasks: true,
      autoCreate: true
    }, {
      onSuccess: (data) => {
        // Clear all pending timeouts
        timeouts.forEach(clearTimeout)
        setGenerationStatus('')
        toast.success('Complete plan generated successfully!')
        console.log('Plan generation result:', data)
      },
      onError: (error: any) => {
        // Clear all pending timeouts
        timeouts.forEach(clearTimeout)
        setGenerationStatus('')

        console.error('Plan generation error:', error)
        console.error('Error response:', error.response?.data)

        let msg = 'Failed to generate plan'

        if (error.response?.status === 500) {
          // Check if it's an embedding issue
          const errorData = error.response?.data
          const errorStr = JSON.stringify(errorData).toLowerCase()

          if (errorStr.includes('embedding') || errorStr.includes('404') || errorStr.includes('batchembedcontents')) {
            msg = '⚠️ Backend embedding service unavailable. Try using "Plan from Custom Description" instead, or ask your backend team to fix the embedding configuration (text-embedding-001 model).'
          } else {
            msg = 'Server error: The AI service encountered an issue. Please try again later.'
          }
        } else if (error.response?.data?.detail) {
          msg = error.response.data.detail
        } else if (error.response?.data?.error) {
          msg = error.response.data.error
        } else if (error.response?.data?.message) {
          msg = error.response.data.message
        } else if (error.message) {
          msg = error.message
        }

        toast.error(msg, { duration: 7000 })
      }
    })
  }

  const handleDeletePlan = () => {
    if (!currentPlan) return

    deletePlanMutation.mutate(currentPlan.id, {
      onSuccess: () => {
        toast.success('Plan deleted successfully')
        setShowDeleteConfirm(false)
      },
      onError: (error: any) => {
        const msg = error?.response?.data?.detail || 'Failed to delete plan'
        toast.error(msg)
        setShowDeleteConfirm(false)
      }
    })
  }

  const handleCreateManualFeature = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPlan) {
      toast.error('Plan not found')
      return
    }
    if (!manualFeatureName.trim()) {
      toast.error('Feature name is required')
      return
    }

    createFeatureMutation.mutate({
      plan: currentPlan.id,
      name: manualFeatureName.trim(),
      description: manualFeatureDescription.trim(),
      priority: manualFeaturePriority,
      estimated_effort: manualFeatureEffort,
      order_index: features ? features.length : 0,
    }, {
      onSuccess: () => {
        toast.success('Manual feature added')
        setShowManualItemDialog(false)
        setManualFeatureName('')
        setManualFeatureDescription('')
        setManualFeaturePriority(5)
        setManualFeatureEffort('medium')
      },
      onError: (error: any) => {
        const msg = error?.response?.data?.detail || error?.response?.data?.error || 'Failed to add manual feature'
        toast.error(msg)
      }
    })
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || !currentPlan) return

    processMessageMutation.mutate({
      planId: currentPlan.id,
      message: prompt,
      context: {
        project_id: projectId,
        plan_id: currentPlan.id,
        user_id: user?.id,
        timestamp: new Date().toISOString()
      }
    }, {
      onSuccess: () => {
        setPrompt('')
      },
      onError: (error: any) => {
        console.error("Planning error full object:", error);
        let errorMessage = "Failed to generate plan. Please try again.";
        if (error.response?.data?.message) errorMessage = error.response.data.message;
        toast.error(errorMessage);
      }
    })
  }

  if (isLoadingPlans) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  if (!currentPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed rounded-lg bg-muted/10 p-8 text-center">
        <GitBranch className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Plan Found</h3>
        <p className="text-muted-foreground max-w-sm mb-6">
          Initialize a project plan to start tracking features, tasks, and using the AI Planner.
        </p>
        <Button onClick={() => createPlanMutation.mutate(projectId)} disabled={createPlanMutation.isPending}>
          {createPlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Initialize Plan
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
      {/* Left: AI Planner Chat */}
      <Card className="flex flex-col h-full lg:col-span-1">
        <CardHeader className="pb-3 border-b bg-muted/5">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI Planner
          </CardTitle>
          <CardDescription className="text-xs">
            Describe features or changes you want to make.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-4 gap-4">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                I can help you organize this project. Tell me what features we need to build, and I'll break them down into a plan.
              </p>
              <div className="bg-muted p-3 rounded-lg text-xs">
                Try: &quot;Add a user authentication system with email login.&quot;
              </div>
              <Separator className="my-4" />
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Quick Actions</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleGenerateCompletePlan}
                  disabled={generateFromDescription.isPending || !project?.description}
                >
                  {generateFromDescription.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                  )}
                  Generate Complete Plan
                </Button>
                <AutonomousPlanDialog
                  planId={currentPlan?.id || ''}
                  onSuccess={() => {
                    // Plan tree will auto-refresh via react-query
                  }}
                  trigger={
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <Wand2 className="mr-2 h-4 w-4" />
                      Plan from Custom Description
                    </Button>
                  }
                />
              </div>
              {generationStatus && (
                <div className="mt-4 p-2 bg-muted rounded text-xs text-muted-foreground">
                  {generationStatus}
                </div>
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSendMessage} className="mt-auto flex gap-2">
            <Input
              placeholder="What should we build next?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
            <Button size="icon" type="submit" disabled={isGenerating || !prompt.trim()}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Right: Feature Tree */}
      <Card className="flex flex-col h-full lg:col-span-2 overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/5 flex flex-row items-center justify-between flex-shrink-0">
          <div>
            <CardTitle>Feature Plan</CardTitle>
            <CardDescription>Current roadmap and status</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowManualItemDialog(true)}>
              <Plus className="h-3 w-3 mr-1" /> Manual Item
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full w-full">
            <div className="p-4">
              {isLoadingTree ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : rootFeatures.length > 0 ? (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2 text-foreground">
                      <GitBranch className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">Execution tree</span>
                      <Badge variant="outline" className="h-5 text-[10px]">
                        {rootFeatures.length} root nodes
                      </Badge>
                    </div>
                    <p className="mt-2 leading-relaxed">
                      The planner is organized as phases and dependency-gated workstreams. Complete upstream roots before their descendants.
                    </p>
                    {executionTrail && (
                      <p className="mt-2 text-[11px] text-muted-foreground/80 truncate">
                        Phase order: {executionTrail}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    {rootFeatures.map((feature: Feature, index: number) => (
                      <FeatureTreeItem
                        key={feature.id}
                        feature={feature}
                        nodeNumber={`${index + 1}`}
                        onSelect={(f) => {
                          setSelectedFeature(f)
                          setIsSheetOpen(true)
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <p className="text-sm">Plan is empty.</p>
                  <p className="text-xs mt-1">Use the AI Planner to generate plan.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <FeatureDetailsSheet
        feature={selectedFeature}
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        projectId={projectId}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Plan?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete the entire plan including all features and tasks. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletePlanMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePlan}
                disabled={deletePlanMutation.isPending}
              >
                {deletePlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {showManualItemDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowManualItemDialog(false)}>
          <div className="mx-4 w-full max-w-lg rounded-lg bg-background p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Add Manual Feature</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a feature manually when you want direct control over planning.
            </p>

            <form onSubmit={handleCreateManualFeature} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Feature Name</label>
                <Input
                  value={manualFeatureName}
                  onChange={(e) => setManualFeatureName(e.target.value)}
                  placeholder="e.g. Delivery Order Lifecycle"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={manualFeatureDescription}
                  onChange={(e) => setManualFeatureDescription(e.target.value)}
                  placeholder="What this feature should deliver"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Priority (1-10)</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={manualFeaturePriority}
                    onChange={(e) => setManualFeaturePriority(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Effort</label>
                  <select
                    value={manualFeatureEffort}
                    onChange={(e) => setManualFeatureEffort(e.target.value as 'small' | 'medium' | 'large' | 'extra_large')}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="extra_large">Extra Large</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowManualItemDialog(false)} disabled={createFeatureMutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createFeatureMutation.isPending}>
                  {createFeatureMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Feature
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
