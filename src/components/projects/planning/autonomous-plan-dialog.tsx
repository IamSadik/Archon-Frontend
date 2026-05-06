'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Loader2, Sparkles, Wand2 } from 'lucide-react'
import { useGenerateFromDescription } from '@/hooks/usePlanning'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

const formSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters'),
  maxFeatures: z.number().int().min(1).max(50),
  includeTasks: z.boolean(),
  autoCreate: z.boolean(),
})

interface AutonomousPlanDialogProps {
  planId: string
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function AutonomousPlanDialog({ planId, trigger, onSuccess }: AutonomousPlanDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      maxFeatures: 10,
      includeTasks: true,
      autoCreate: true,
    },
  })

  const generatePlan = useGenerateFromDescription()

  function onSubmit(values: z.infer<typeof formSchema>) {
    generatePlan.mutate({
      planId,
      description: values.description,
      maxFeatures: values.maxFeatures,
      includeTasks: values.includeTasks,
      autoCreate: values.autoCreate,
    }, {
      onSuccess: () => {
        toast.success('Plan generated successfully!')
        setOpen(false)
        form.reset()
        onSuccess?.()
      },
      onError: (error: any) => {
        const msg = error?.response?.data?.detail || 'Failed to generate plan'
        toast.error(msg)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm" variant="default">
            <Wand2 className="mr-2 h-4 w-4" /> 
            Generate Plan
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Autonomous Plan Generation
          </DialogTitle>
          <DialogDescription>
            Describe your project and let AI generate a complete feature breakdown with tasks.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Build a REST API with user authentication, file upload, and real-time notifications..." 
                      className="h-32 resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Be specific about features, tech stack, and requirements
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxFeatures"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Features</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={1}
                      max={50}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Maximum number of features to generate (1-50)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="includeTasks"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Generate subtasks for each feature
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Break down features into actionable tasks
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="autoCreate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Auto-create features instantly
                      </FormLabel>
                      <FormDescription className="text-xs">
                        If unchecked, you'll review before creation
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={generatePlan.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={generatePlan.isPending}>
                {generatePlan.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Generate Plan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
