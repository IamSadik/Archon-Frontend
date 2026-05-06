import { MainNav } from '@/components/main-nav'
import { UserNav } from '@/components/user-nav'
import { ModeToggle } from '@/components/mode-toggle'
import Link from 'next/link'
import { BrainCircuit } from 'lucide-react'

export function Header() {
  return (
    <header className='border-b'>
      <div className='flex h-16 items-center px-4'>
        <div className='flex items-center gap-2 font-bold text-xl mr-8'>
             <BrainCircuit className='h-6 w-6 mr-2 text-primary' />
             <Link href='/dashboard'>Archon</Link>
        </div>
        
        {/* <MainNav className='mx-6' /> */}
        <div className='ml-auto flex items-center space-x-4'>
           <ModeToggle />
           <UserNav />
        </div>
      </div>
    </header>
  )
}
