import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Trash2, Archive, ArchiveRestore, Save, Loader2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { projectService } from '@/services/project.service'
import { Project } from '@/types'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'

interface ProjectSettingsDialogProps {
    project: Project
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ProjectSettingsDialog({ project, trigger, open, onOpenChange }: ProjectSettingsDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()
    const queryClient = useQueryClient()
    const { register, handleSubmit } = useForm({
        defaultValues: {
            name: project.name,
            description: project.description,
            repository_path: project.repository_path,
            repository_url: project.repository_url
        }
    })

    const updateMutation = useMutation({
        mutationFn: (data: Partial<Project>) => projectService.updateProject(project.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', project.id] })
            toast.success('Project settings saved')
            onOpenChange ? onOpenChange(false) : setIsOpen(false)
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.detail || 'Failed to save project settings')
        }
    })

    const archiveMutation = useMutation({
        mutationFn: () => projectService.archiveProject(project.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', project.id] })
            toast.success('Project archived')
            onOpenChange ? onOpenChange(false) : setIsOpen(false)
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.detail || 'Failed to archive project')
        }
    })

    const activateMutation = useMutation({
        mutationFn: () => projectService.activateProject(project.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', project.id] })
            toast.success('Project activated')
            onOpenChange ? onOpenChange(false) : setIsOpen(false)
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.detail || 'Failed to activate project')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: () => projectService.deleteProject(project.id),
        onSuccess: () => {
            toast.success('Project deleted')
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            router.push('/dashboard')
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.detail || 'Failed to delete project')
        }
    })

    const onSubmit = (data: any) => {
        updateMutation.mutate(data)
    }

    const dialogOpen = open ?? isOpen
    const handleDialogOpenChange = (nextOpen: boolean) => {
        if (onOpenChange) {
            onOpenChange(nextOpen)
            return
        }
        setIsOpen(nextOpen)
    }

    return (
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Project Settings</DialogTitle>
                    <DialogDescription>
                        Manage configuration for {project.name}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Project Name</Label>
                            <Input id="name" {...register('name')} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" {...register('description')} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="repository_path">Local Repository Path</Label>
                            <Input id="repository_path" {...register('repository_path')} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="repository_url">Git Repository URL</Label>
                            <Input id="repository_url" {...register('repository_url')} />
                        </div>
                    </div>

                    <div className="flex justify-between items-center border-t pt-4">
                        <div className="flex gap-2">
                            {project.status === 'active' ? (
                                <Button type="button" variant="secondary" size="sm" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending}>
                                    {archiveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}
                                    Archive
                                </Button>
                            ) : (
                                <Button type="button" variant="secondary" size="sm" onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending}>
                                    {activateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4 mr-2" />}
                                    Activate
                                </Button>
                            )}

                            <Button type="button" variant="destructive" size="sm" onClick={() => {
                                if (confirm('Are you sure you want to delete this project? This cannot be undone.')) {
                                    deleteMutation.mutate()
                                }
                            }} disabled={deleteMutation.isPending}>
                                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                Delete
                            </Button>
                        </div>

                        <Button type="submit" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}