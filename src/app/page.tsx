'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, BrainCircuit, Check, Code2, GitBranch, Terminal } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useAuth'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ModeToggle } from '@/components/mode-toggle'

export default function HomePage() {
  const { data: user, isLoading } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link className="flex items-center justify-center font-bold" href="#">
          <BrainCircuit className="h-6 w-6 mr-2 text-primary" />
          <span className="text-xl">Archon</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <ModeToggle />
          <Link className="text-sm font-medium hover:underline underline-offset-4 flex items-center" href="/login">
            Sign In
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Your Autonomous <span className="text-primary">Engineering Partner</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Archon is more than a chatbot. It's a memory-aware, planning-driven AI agent that helps you build, maintain, and evolve software projects over time.
                </p>
              </div>
              <div className="space-x-4">
                <Button size="lg" asChild>
                  <Link href="/register">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                   <Link href="/login">Log In</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
           <div className="container px-4 md:px-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col items-center text-center space-y-3 p-4">
                   <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <GitBranch className="h-6 w-6" />
                   </div>
                   <h3 className="text-xl font-bold">Project Aware</h3>
                   <p className="text-muted-foreground">Understands your entire codebase, dependencies, and file structure, not just snippets.</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-3 p-4">
                   <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Terminal className="h-6 w-6" />
                   </div>
                   <h3 className="text-xl font-bold">Autonomous Plans</h3>
                   <p className="text-muted-foreground">Creates hierarchical plans, tracks tasks, and executes multi-step engineering workflows.</p>
                </div>
                 <div className="flex flex-col items-center text-center space-y-3 p-4">
                   <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Code2 className="h-6 w-6" />
                   </div>
                   <h3 className="text-xl font-bold">Persistent Memory</h3>
                   <p className="text-muted-foreground">Remembers your architectural decisions, preferences, and unfinished work across sessions.</p>
                </div>
             </div>
           </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">© 2026 Archon Inc. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
