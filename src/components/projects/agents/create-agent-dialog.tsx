'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Loader2, Bot } from 'lucide-react'
import { agentService } from '@/services/agent.service'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { planningService } from '@/services/planning.service'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const formSchema = z.object({
  session_name: z.string().min(2, 'Name must be at least 2 characters'),
  agent_type: z.string().min(1, 'Please select an agent type'),
  goal: z.string().optional(),
  feature_id: z.string().optional(),
  scaffold_only: z.boolean(),
})

interface CreateAgentDialogProps {
  projectId: string
  trigger?: React.ReactNode
  onSuccess?: () => void
  defaultFeatureId?: string
}

export function CreateAgentDialog({ projectId, trigger, onSuccess, defaultFeatureId }: CreateAgentDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  // Fetch plans to find the active plan for this project
  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => planningService.getPlans(),
  })

  const activePlan = plans?.find(p => p.project === projectId)

  // Fetch features if we have a plan
  const { data: features } = useQuery({
    queryKey: ['features', activePlan?.id],
    queryFn: () => planningService.getFeatures(activePlan!.id),
    enabled: !!activePlan?.id
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      session_name: '',
      agent_type: '',
      goal: '',
      feature_id: defaultFeatureId || 'none', // Use 'none' for Select handling
      scaffold_only: false,
    },
  })

  const selectedFeatureId = form.watch('feature_id')
  const linkedFeature = features?.find((f) => f.id === selectedFeatureId)
  const hasLinkedFeature = !!linkedFeature && selectedFeatureId !== 'none'

  // Update default feature if prop changes
  if (defaultFeatureId && form.getValues('feature_id') !== defaultFeatureId) {
    form.setValue('feature_id', defaultFeatureId)
  }

  // Mutation to create agent session
  const createSession = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      const normalizedGoal = hasLinkedFeature
        ? `Implement linked feature: ${linkedFeature?.name || 'selected feature'}`
        : (values.goal || '').trim()

      if (!hasLinkedFeature && normalizedGoal.length < 5) {
        throw new Error('Please provide a clear goal')
      }

      const payload: any = {
        project: projectId,
        session_name: values.session_name,
        agent_type: values.agent_type,
        goal: normalizedGoal,
        context: {
          scaffold_only: !!values.scaffold_only,
          max_iterations: values.scaffold_only ? 4 : 12,
        },
      }

      if (values.feature_id && values.feature_id !== 'none') {
        payload.feature = values.feature_id
      }

      return agentService.createSession(payload)
    },
    onSuccess: () => {
      toast.success('Agent session created successfully!')

      // Force immediate refetch of agent sessions
      queryClient.invalidateQueries({ queryKey: ['agent-sessions', projectId] })

      setOpen(false)
      form.reset()
      onSuccess?.()
    },
    onError: (err: any) => {
      const msg = err?.message || err?.response?.data?.detail || 'Failed to create agent session';
      toast.error(msg)
    }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    createSession.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm"><Bot className="mr-2 h-4 w-4" /> New Agent</Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Agent Task</DialogTitle>
          <DialogDescription>
            Configure a specialized AI agent to work on a specific goal.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="session_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Project Analysis" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agent_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an agent type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="coder">Coder</SelectItem>
                      <SelectItem value="planner">Planner</SelectItem>
                      <SelectItem value="reviewer">Reviewer</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {features && features.length > 0 && (
              <FormField
                control={form.control}
                name="feature_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Feature (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a feature" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">-- No Feature --</SelectItem>
                        {features.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {hasLinkedFeature ? (
              <FormItem>
                <FormLabel>Execution Goal</FormLabel>
                <FormControl>
                  <Input value={`Implement linked feature: ${linkedFeature?.name || ''}`} readOnly />
                </FormControl>
              </FormItem>
            ) : (
              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this agent should achieve..."
                        className="h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="scaffold_only"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scaffold only (no content)</FormLabel>
                  <FormControl>
                    <label className='flex cursor-pointer items-center gap-2 text-sm text-muted-foreground'>
                      <input
                        type='checkbox'
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      Create folders/files only and skip content generation.
                    </label>
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={createSession.isPending}>
                {createSession.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Agent
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
