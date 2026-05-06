'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Loader2, Plus } from 'lucide-react'
import { projectService } from '@/services/project.service'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const formSchema = z.object({
  name: z.string().optional(),
  idea_prompt: z.string().min(10, {
    message: 'Please provide your project idea in at least 10 characters.',
  }),
  language: z.string().optional(),
  framework: z.string().optional(),
  repository_path: z.string().optional(),
})

interface CreateProjectDialogProps {
  trigger?: React.ReactNode
}

export function CreateProjectDialog({ trigger }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [refinedPreview, setRefinedPreview] = useState<string>('')
  const [sourceIdeaPreview, setSourceIdeaPreview] = useState<string>('')
  const router = useRouter()
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      idea_prompt: '',
      language: '',
      framework: '',
      repository_path: '',
    },
  })

  const refineIdea = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      const payload = {
        idea_prompt: values.idea_prompt,
        name: values.name?.trim() || undefined,
        language: values.language?.trim() || undefined,
        framework: values.framework?.trim() || undefined,
        repository_path: values.repository_path?.trim() || undefined,
        auto_create: false,
      }
      return projectService.refineIdea(payload)
    },
    onSuccess: (result) => {
      setSourceIdeaPreview(result.idea_prompt)
      setRefinedPreview(result.refined_prompt)
      toast.success('Idea refined. Review and confirm project creation.')
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || error.message || 'Failed to refine idea'
      toast.error(msg)
    },
  })

  // Mutation to create a project
  const createProject = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      const payload = {
        idea_prompt: values.idea_prompt,
        auto_create: true,
        name: values.name?.trim() || undefined,
        language: values.language?.trim() || undefined,
        framework: values.framework?.trim() || undefined,
        repository_path: values.repository_path?.trim() || undefined,
      }
      return projectService.refineIdeaAndCreateProject(payload)
    },
    onSuccess: (result) => {
      const newProject = result.project
      if (!newProject) {
        toast.error('Project created response is missing project payload')
        return
      }

      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project created with refined brief')
      setOpen(false)
      form.reset()
      router.push(`/projects/${newProject.id}`)
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || error.message || 'Failed to create project';
      toast.error(msg)
    }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!refinedPreview) {
      refineIdea.mutate(values)
      return
    }

    createProject.mutate(values)
  }

  const isBusy = refineIdea.isPending || createProject.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className='sm:max-w-[560px] max-h-[90vh] overflow-hidden'>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project workspace to start collaborating with Archon.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <div className='max-h-[62vh] overflow-y-auto space-y-4 pr-1'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder='Name inferred if empty' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='idea_prompt'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Messy Idea Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Describe your product idea freely. Archon will refine it into a professional project brief.'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This raw prompt is refined by backend and saved with the created project.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='language'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Language (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder='python, typescript, go...' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='framework'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Framework (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder='django, next.js, fastapi...' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='repository_path'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local Repository Path (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder='/path/to/local/repo' {...field} />
                    </FormControl>
                    <FormDescription>
                      Absolute path to an existing local folder to index properly.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {refinedPreview && (
                <div className='space-y-3 rounded-md border bg-muted/30 p-3'>
                  <h4 className='text-sm font-semibold'>Refined Project Brief Preview</h4>
                  <p className='text-xs text-muted-foreground'>
                    Original idea
                  </p>
                  <p className='text-sm whitespace-pre-wrap rounded bg-background p-2 max-h-32 overflow-auto'>
                    {sourceIdeaPreview}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    Professional refined brief
                  </p>
                  <p className='text-sm whitespace-pre-wrap rounded bg-background p-2 max-h-40 overflow-auto'>
                    {refinedPreview}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              {refinedPreview && (
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setRefinedPreview('')
                    setSourceIdeaPreview('')
                  }}
                  disabled={isBusy}
                >
                  Edit Idea
                </Button>
              )}
              <Button type='submit' disabled={isBusy}>
                {isBusy && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                {refinedPreview ? 'Create Project from Brief' : 'Refine Idea'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
