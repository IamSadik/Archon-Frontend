import { useQuery } from '@tanstack/react-query';
import { memoryService } from '@/services';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Database, FileText } from 'lucide-react';

export function ProjectMemory({ projectId }: { projectId: string }) {
    const { data: shortTerm = [] } = useQuery({
        queryKey: ['memory', 'short-term', projectId],
        queryFn: () => memoryService.getShortTerm(projectId)
    });

    const { data: longTerm = [] } = useQuery({
        queryKey: ['memory', 'long-term', projectId],
        queryFn: () => memoryService.getLongTerm(projectId)
    });

    return (
        <div className='flex flex-col h-full min-h-0 space-y-4'>
            <div>
                <h3 className='text-lg font-medium flex items-center gap-2'>
                    <Brain className='h-5 w-5' />
                    Project Memory
                </h3>
                <p className='text-sm text-muted-foreground'>
                    View what Archon has learned and remembered about this project.
                </p>
            </div>

            <div className='grid gap-4 md:grid-cols-2 h-[calc(100vh-16rem)] min-h-0'>
                <Card className='flex flex-col min-h-0'>
                    <CardHeader>
                        <CardTitle className='text-base flex items-center gap-2'>
                            <FileText className='h-4 w-4 text-blue-500' />
                            Short-Term Context
                        </CardTitle>
                        <CardDescription>Active session context and recent facts</CardDescription>
                    </CardHeader>
                    <CardContent className='flex-1 min-h-0 overflow-hidden p-0'>
                        <ScrollArea className='h-full px-6 pb-4'>
                            <div className='space-y-3'>
                                {shortTerm?.map(mem => (
                                    <div key={mem.id} className='p-3 bg-muted/50 rounded-lg text-sm border'>
                                        <div className='flex justify-between items-center mb-1'>
                                            <span className='font-semibold text-xs uppercase text-muted-foreground'>{mem.memory_key}</span>
                                            <span className='text-[10px] text-muted-foreground'>{new Date(mem.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="whitespace-pre-wrap font-mono text-xs">
                                            {typeof mem.content === 'object' ? JSON.stringify(mem.content, null, 2) : mem.content}
                                        </div>
                                    </div>
                                ))}
                                {!shortTerm?.length && <p className='text-sm text-muted-foreground text-center py-4'>No short-term memory yet.</p>}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className='flex flex-col min-h-0'>
                    <CardHeader>
                        <CardTitle className='text-base flex items-center gap-2'>
                            <Database className='h-4 w-4 text-purple-500' />
                            Long-Term Knowledge
                        </CardTitle>
                        <CardDescription>Persistent patterns, decisions, and preferences</CardDescription>
                    </CardHeader>
                    <CardContent className='flex-1 min-h-0 overflow-hidden p-0'>
                        <ScrollArea className='h-full px-6 pb-4'>
                            <div className='space-y-3'>
                                {longTerm?.map(mem => (
                                    <div key={mem.id} className='p-3 bg-muted/50 rounded-lg text-sm border border-l-4 border-l-purple-500'>
                                        <div className='flex justify-between items-center mb-1'>
                                            <Badge variant='outline' className='text-[10px] uppercase'>{mem.category || 'General'}</Badge>
                                            <span className='text-[10px] font-medium'>Score: {mem.importance_score}</span>
                                        </div>
                                        <div className='mt-2 whitespace-pre-wrap font-mono text-xs'>
                                            {typeof mem.content === 'object' ? JSON.stringify(mem.content, null, 2) : mem.content}
                                        </div>
                                    </div>
                                ))}
                                {!longTerm?.length && <p className='text-sm text-muted-foreground text-center py-4'>No long-term memory yet.</p>}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
