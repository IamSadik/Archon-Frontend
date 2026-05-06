import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Play, Terminal, Pause, XCircle } from 'lucide-react'
import { useAgentSessions, useCreateAgentSession } from '@/hooks/useAgents'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDistanceToNow } from 'date-fns'

export function ProjectAgents({ projectId }: { projectId: string }) {
    const { data: sessions, isLoading } = useAgentSessions(projectId)
    const createSession = useCreateAgentSession()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newSession, setNewSession] = useState({
        session_name: '',
        agent_type: 'coder',
        goal: ''
    })

    const handleCreate = async () => {
        if (!newSession.session_name || !newSession.goal) return
        await createSession.mutateAsync({
            project: projectId,
            feature: undefined, // Optional
            ...newSession
        })
        setIsDialogOpen(false)
        setNewSession({ session_name: '', agent_type: 'coder', goal: '' })
    }

    if (isLoading) return <div className='p-8'><Loader2 className='animate-spin' /></div>

    return (
        <div className='flex flex-col h-full space-y-4'>
             <div className='flex justify-between items-center'>
                 <div>
                     <h3 className='text-lg font-medium'>Autonomous Agents</h3>
                     <p className='text-sm text-muted-foreground'>Manage and monitor autonomous coding sessions.</p>
                 </div>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                     <DialogTrigger asChild>
                         <Button><Play className='mr-2 h-4 w-4' /> New Session</Button>
                     </DialogTrigger>
                     <DialogContent>
                         <DialogHeader>
                             <DialogTitle>Start Agent Session</DialogTitle>
                             <DialogDescription>Define the goal for the autonomous agent.</DialogDescription>
                         </DialogHeader>
                         <div className='grid gap-4 py-4'>
                             <div className='grid gap-2'>
                                 <Label>Session Name</Label>
                                 <Input 
                                     placeholder='e.g. Refactor Auth' 
                                     value={newSession.session_name}
                                     onChange={e => setNewSession({...newSession, session_name: e.target.value})}
                                 />
                             </div>
                             <div className='grid gap-2'>
                                 <Label>Agent Type</Label>
                                 <Select 
                                    value={newSession.agent_type}
                                    onValueChange={val => setNewSession({...newSession, agent_type: val})}
                                 >
                                     <SelectTrigger>
                                         <SelectValue />
                                     </SelectTrigger>
                                     <SelectContent>
                                         <SelectItem value='coder'>Coder (Implementation)</SelectItem>
                                         <SelectItem value='planner'>Planner (Architecture)</SelectItem>
                                         <SelectItem value='reviewer'>Reviewer (QA)</SelectItem>
                                         <SelectItem value='general'>General</SelectItem>
                                     </SelectContent>
                                 </Select>
                             </div>
                             <div className='grid gap-2'>
                                 <Label>Goal</Label>
                                 <Input 
                                     placeholder='What should the agent achieve?' 
                                     value={newSession.goal}
                                     onChange={e => setNewSession({...newSession, goal: e.target.value})}
                                 />
                             </div>
                         </div>
                         <DialogFooter>
                             <Button onClick={handleCreate} disabled={createSession.isPending}>
                                 {createSession.isPending ? 'Starting...' : 'Start Session'}
                             </Button>
                         </DialogFooter>
                     </DialogContent>
                 </Dialog>
             </div>

             <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                 {sessions?.map(session => (
                     <Card key={session.id}>
                         <CardHeader className='pb-3'>
                             <div className='flex justify-between items-start'>
                                 <CardTitle className='text-base'>{session.session_name}</CardTitle>
                                 <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                                     {session.status}
                                 </Badge>
                             </div>
                             <CardDescription className='line-clamp-2'>{session.goal}</CardDescription>
                         </CardHeader>
                         <CardContent className='pb-3'>
                             <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                 <Terminal className='h-3 w-3' />
                                 <span className='capitalize'>{session.agent_type} Agent</span>
                                 <span>•</span>
                                 <span>{formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}</span>
                             </div>
                         </CardContent>
                         <CardFooter className='border-t pt-3 flex justify-between'>
                             <Button variant='outline' size='sm'>View Logs</Button>
                             {session.status === 'active' && <Button variant='destructive' size='sm'><Pause className='h-3 w-3 mr-1'/> Pause</Button>}
                         </CardFooter>
                     </Card>
                 ))}
                 {sessions?.length === 0 && (
                     <div className='col-span-full text-center p-8 text-muted-foreground border border-dashed rounded-lg'>
                         No active agent sessions.
                     </div>
                 )}
             </div>
        </div>
    )
}
