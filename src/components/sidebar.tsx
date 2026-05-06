'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { LayoutDashboard, Settings, FolderGit2, MessageSquare, BrainCircuit, FileText, Play, Users, HardDrive } from 'lucide-react'

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  const items = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Projects',
      href: '/projects', 
      icon: FolderGit2,
      disabled: false 
    },
    {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        disabled: true
    }
  ]

  return (
    <div className={cn('pb-12', className)}>
      <div className='space-y-4 py-4'>
        <div className='px-3 py-2'>
          <h2 className='mb-2 px-4 text-lg font-semibold tracking-tight'>
            Overview
          </h2>
          <div className='space-y-1'>
            {items.map((item) => (
               !item.disabled && (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: pathname === item.href ? 'secondary' : 'ghost', size: 'sm' }),
                  'w-full justify-start'
                )}
              >
                 {item.icon && <item.icon className='mr-2 h-4 w-4' />}
                {item.title}
              </Link>
               )
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
