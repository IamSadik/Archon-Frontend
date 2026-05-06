'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
    LayoutDashboard, 
    Files, 
    GitBranch, 
    MessageSquare, 
    Settings, 
    BrainCircuit
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    projectId: string
}

export function ProjectSidebar({ className, projectId }: SidebarProps) {
    const pathname = usePathname()
    const baseUrl = `/dashboard/projects/${projectId}`

    const links = [
        { name: 'Overview', href: `${baseUrl}`, icon: LayoutDashboard },
        { name: 'Plan & Tasks', href: `${baseUrl}/plan`, icon: GitBranch },
        { name: 'File Browser', href: `${baseUrl}/files`, icon: Files },
        { name: 'Chat Agent', href: `${baseUrl}/chat`, icon: MessageSquare },
        { name: 'Memory', href: `${baseUrl}/memory`, icon: BrainCircuit },
        { name: 'Settings', href: `${baseUrl}/settings`, icon: Settings },
    ]

    return (
        <div className={cn('pb-12', className)}>
            <div className='space-y-4 py-4'>
                <div className='px-3 py-2'>
                    <h2 className='mb-2 px-4 text-lg font-semibold tracking-tight'>
                        Project
                    </h2>
                    <div className='space-y-1'>
                        {links.map((link) => (
                            <Button
                                key={link.href}
                                variant={pathname === link.href ? 'secondary' : 'ghost'}
                                className='w-full justify-start'
                                asChild
                            >
                                <Link href={link.href}>
                                    <link.icon className='mr-2 h-4 w-4' />
                                    {link.name}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
