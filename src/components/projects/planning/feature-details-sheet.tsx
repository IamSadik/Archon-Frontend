import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
    useUpdateFeatureStatus,
    useTasks,
    useCreateTask,
    useUpdateTaskStatus,
    useDeleteTask
} from '@/hooks/usePlanning'
import { Feature, Task } from '@/types'
import { useState, useEffect } from 'react'
import { Loader2, Bot, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { CreateAgentDialog } from '@/components/projects/agents/create-agent-dialog'

interface FeatureDetailsSheetProps {
    feature: Feature | null
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
}

export function FeatureDetailsSheet({ feature, isOpen, onOpenChange, projectId }: FeatureDetailsSheetProps) {
    const [status, setStatus] = useState<string>(feature?.status || 'not_started')
    const [blockingReason, setBlockingReason] = useState<string>(feature?.blocking_reason || '')
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [strictSerializedMode, setStrictSerializedMode] = useState(true)

    const { mutate: updateStatus, isPending } = useUpdateFeatureStatus()

    // Task hooks
    const { data: tasks, isLoading: isLoadingTasks } = useTasks(feature?.id || '')
    const createTask = useCreateTask()
    const updateTaskStatus = useUpdateTaskStatus()
    const deleteTask = useDeleteTask()

    useEffect(() => {
        if (feature) {
            setStatus(feature.status)
            setBlockingReason(feature.blocking_reason || '')
        }
    }, [feature])

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault()
        if (!feature || !newTaskTitle.trim()) return

        createTask.mutate({
            feature: feature.id,
            title: newTaskTitle,
            status: 'pending',
            task_type: 'code_generation',
            order_index: tasks ? tasks.length : 0
        }, {
            onSuccess: () => {
                setNewTaskTitle('')
                toast.success('Task added')
            },
            onError: () => toast.error('Failed to add task')
        })
    }

    const toggleTaskStatus = (task: Task) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed'
        updateTaskStatus.mutate({
            taskId: task.id,
            status: newStatus
        })
    }

    const handleDeleteTask = (taskId: string) => {
        deleteTask.mutate(taskId, {
            onSuccess: () => toast.success('Task deleted'),
            onError: () => toast.error('Failed to delete task')
        })
    }

    const handleSave = () => {
        if (!feature) return

        if (status === 'blocked' && !blockingReason.trim()) {
            toast.error("Please provide a blocking reason")
            return
        }

        updateStatus({
            featureId: feature.id,
            status,
            blockingReason: blockingReason,
            strictSerializedMode,
        }, {
            onSuccess: () => {
                toast.success("Feature updated")
                onOpenChange(false)
            },
            onError: (error: any) => {
                console.error("Update status error:", error)
                let msg = "Failed to update status"
                if (error.response?.data) {
                    const data = error.response.data
                    if (typeof data === 'object') {
                        const keys = Object.keys(data)
                        if (keys.length > 0) {
                            const firstErr = data[keys[0]]
                            msg = Array.isArray(firstErr) ? firstErr[0] : String(firstErr)
                        }
                    }
                }
                toast.error(msg)
            }
        })
    }

    if (!feature) return null

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[500px]">
                <SheetHeader>
                    <SheetTitle>{feature.name}</SheetTitle>
                    <SheetDescription>
                        Feature Details and Status
                    </SheetDescription>
                </SheetHeader>
                <div className="py-6 space-y-6">
                    <div className="flex justify-end">
                        <CreateAgentDialog
                            projectId={projectId}
                            defaultFeatureId={feature.id}
                            onSuccess={() => onOpenChange(false)}
                            trigger={
                                <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                                    <Bot className="mr-2 h-4 w-4" />
                                    Start Agent for Task
                                </Button>
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md border">
                            {feature.description || "No description provided."}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <div>
                                <Badge variant="outline">P{feature.priority}</Badge>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Effort</Label>
                            <div className="text-sm text-muted-foreground">
                                {feature.estimated_effort ? `${feature.estimated_effort} Hours` : 'Not detailed'}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="not_started">Not Started</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                                <SelectItem value="blocked">Blocked</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 rounded-md border bg-muted/20 p-2">
                        <Checkbox
                            checked={strictSerializedMode}
                            onCheckedChange={(checked) => setStrictSerializedMode(!!checked)}
                            id="strict-serialized-mode"
                        />
                        <Label htmlFor="strict-serialized-mode" className="text-sm">
                            Strict serialized mode (enforce dependencies before starting/completing)
                        </Label>
                    </div>

                    {status === 'blocked' && (
                        <div className="space-y-2">
                            <Label>Blocking Reason</Label>
                            <Textarea
                                placeholder="Why is this blocked?"
                                value={blockingReason}
                                onChange={(e) => setBlockingReason(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="space-y-3">
                        <Label>Tasks</Label>
                        <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                            <form onSubmit={handleAddTask} className="flex gap-2">
                                <Input
                                    placeholder="Add a subtask..."
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    className="h-8 text-sm"
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    variant="secondary"
                                    disabled={!newTaskTitle.trim() || createTask.isPending}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </form>

                            <div className="space-y-2">
                                {isLoadingTasks ? (
                                    <div className="flex justify-center py-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                ) : tasks && tasks.length > 0 ? (
                                    tasks.map((task: Task) => (
                                        <div key={task.id} className="flex items-center gap-2 group">
                                            <button
                                                onClick={() => toggleTaskStatus(task)}
                                                className="text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                {task.status === 'completed' ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Circle className="h-4 w-4" />
                                                )}
                                            </button>
                                            <span className={`text-sm flex-1 ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                                {task.title}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteTask(task.id)}
                                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-center text-muted-foreground py-2">No tasks yet.</p>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
                <SheetFooter>
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}