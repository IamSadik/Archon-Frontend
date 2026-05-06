import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ChatSessionPageProps {
    params: {
        sessionId: string
    }
}

export default function ChatSessionPage({ params }: ChatSessionPageProps) {
    return (
        <div className='flex-1 space-y-4 p-8 pt-6'>
            <div className='flex items-center justify-between'>
                <h2 className='text-2xl font-bold'>Chat Session</h2>
                <Button asChild variant='outline'>
                    <Link href='/dashboard'>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>
            <p className='text-sm text-muted-foreground'>
                Session ID: <span className='font-mono'>{params.sessionId}</span>
            </p>
            <p className='text-sm text-muted-foreground'>
                Use the project-level Chat tab for the full IDE workflow experience.
            </p>
        </div>
    )
}
