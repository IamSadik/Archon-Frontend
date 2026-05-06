import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePlans, usePlanTree, useProcessPlanningMessage } from '@/hooks/usePlanning'
import { Feature } from '@/types'
import { CheckCircle2, Circle, Loader2, Plus, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

// A recursive component to render the feature tree
const FeatureNode = ({ feature, level = 0 }: { feature: Feature, level?: number }) => {
    return (
        <div className='border-l border-border/50 ml-2 pl-2 py-1' >
            <div className='flex items-center gap-2 p-1 hover:bg-muted/50 rounded group'>
                {feature.status === 'completed' ? (
                    <CheckCircle2 className='h-4 w-4 text-green-500' />
                ) : (
                    <Circle className='h-4 w-4 text-muted-foreground' />
                )}
                <span className='font-medium text-sm'>{feature.name}</span>
                <Badge variant='outline' className='text-[10px] h-5 capitalize'>{feature.status}</Badge>
                {feature.priority && <Badge variant='secondary' className='text-[10px] h-5'>P{feature.priority}</Badge>}
            </div>
            {feature.children && feature.children.length > 0 && (
                <div className='mt-1'>
                    {feature.children.map(child => (
                        <FeatureNode key={child.id} feature={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    )
}

export function ProjectPlanning({ projectId }: { projectId: string }) {
    const { data: plans, isLoading: isPlansLoading } = usePlans()
    const [newMessage, setNewMessage] = useState('')

    // Find the plan associated with this project. 
    // In a real scenario, we might have multiple plans, but we'll take the first one for now.
    const activePlan = plans?.find(p => p.project === projectId || p.project === projectId) // Match ID

    const { data: features, isLoading: isTreeLoading } = usePlanTree(activePlan?.id || '')
    const processMessage = useProcessPlanningMessage()

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || !activePlan) return

        try {
            await processMessage.mutateAsync({
                planId: activePlan.id,
                message: newMessage
            })
            setNewMessage('')
        } catch (error) {
            console.error('Failed to process message:', error)
        }
    }

    if (isPlansLoading) {
        return <div className='flex justify-center p-8'><Loader2 className='h-6 w-6 animate-spin' /></div>
    }

    if (!activePlan) {
        return (
            <Card className='h-full'>
                <CardHeader>
                    <CardTitle>No Plan Found</CardTitle>
                    <CardDescription>Create a plan to get started</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button>Create Plan</Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]'>
            <Card className='lg:col-span-2 flex flex-col h-full'>
                <CardHeader className='pb-3'>
                    <CardTitle>Feature Tree</CardTitle>
                    <CardDescription>
                        {activePlan.project_name || `Plan ${activePlan.id.slice(0, 8)}`}
                    </CardDescription>
                </CardHeader>
                <CardContent className='flex-1 overflow-y-auto min-h-0'>
                    {isTreeLoading ? (
                        <div className='flex justify-center p-8'><Loader2 className='h-6 w-6 animate-spin text-muted-foreground' /></div>
                    ) : features && features.length > 0 ? (
                        <div className='space-y-1'>
                            {features.map(feature => (
                                <FeatureNode key={feature.id} feature={feature} />
                            ))}
                        </div>
                    ) : (
                        <div className='text-center text-muted-foreground p-8'>
                            No features yet. Describe your app to generate a plan.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className='flex flex-col h-full'>
                <CardHeader className='pb-3'>
                    <CardTitle>Planner Assistant</CardTitle>
                    <CardDescription>Discuss requirements modify the plan</CardDescription>
                </CardHeader>
                <CardContent className='flex-1 flex flex-col min-h-0'>
                    <div className='flex-1 overflow-y-auto space-y-4 mb-4 p-1'>
                        <div className='bg-muted/50 p-3 rounded-lg text-sm'>
                            <p>I can help you structure your project. Describe a feature you want to build.</p>
                        </div>
                    </div>
                    <form onSubmit={handleSendMessage} className='flex gap-2 mt-auto'>
                        <Input
                            placeholder='e.g., Add user authentication'
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={processMessage.isPending}
                        />
                        <Button type='submit' size='icon' disabled={processMessage.isPending}>
                            {processMessage.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
