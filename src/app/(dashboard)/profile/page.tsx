'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import {
    Activity,
    ArrowUpRight,
    BadgeCheck,
    Bell,
    CalendarDays,
    Clock3,
    Code2,
    CloudCog,
    Fingerprint,
    FolderGit2,
    Sparkles,
    UserRound,
} from 'lucide-react'

import { authService } from '@/services/auth.service'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const highlights = [
    {
        icon: Fingerprint,
        label: 'Backend-synced identity',
        description: 'Display name, avatar, and account metadata are pulled from the API.',
    },
    {
        icon: Code2,
        label: 'Workspace context',
        description: 'Projects, sessions, and activity are populated from live backend data.',
    },
    {
        icon: CloudCog,
        label: 'Real activity feed',
        description: 'Project changes and account actions are logged as actual timeline items.',
    },
]

export default function ProfilePage() {
    const { data: overview, isLoading } = useQuery({
        queryKey: ['profileOverview'],
        queryFn: authService.getProfileOverview,
        retry: false,
    })

    const user = overview?.user
    const currentProject = overview?.current_project || null
    const recentProjects = overview?.recent_projects || []
    const recentSessions = overview?.recent_sessions || []
    const recentActivity = overview?.recent_activity || []
    const stats = overview?.stats

    const initials = useMemo(() => {
        const base = user?.full_name || user?.username || 'User'
        return base.slice(0, 2).toUpperCase()
    }, [user?.full_name, user?.username])

    const joinedAgo = useMemo(() => {
        if (!user?.date_joined) return 'recently'
        return formatDistanceToNow(new Date(user.date_joined), { addSuffix: true })
    }, [user?.date_joined])

    const formatTime = (value?: string | null) => {
        if (!value) return 'Recently'
        return formatDistanceToNow(new Date(value), { addSuffix: true })
    }

    if (isLoading) {
        return (
            <div className='flex min-h-[70vh] items-center justify-center'>
                <div className='flex items-center gap-2 text-muted-foreground'>
                    <UserRound className='h-5 w-5 animate-pulse' /> Loading profile...
                </div>
            </div>
        )
    }

    return (
        <div className='min-h-full bg-gradient-to-b from-background via-background to-muted/20'>
            <div className='mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8'>
                <div className='overflow-hidden rounded-3xl border bg-card shadow-sm'>
                    <div className='grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8'>
                        <div className='space-y-5'>
                            <div className='flex flex-wrap items-center gap-2'>
                                <Badge variant='secondary' className='gap-1 rounded-full px-3 py-1'>
                                    <UserRound className='h-3.5 w-3.5' /> Profile
                                </Badge>
                                <Badge variant='outline' className='rounded-full px-3 py-1'>Backend connected</Badge>
                            </div>
                            <div className='space-y-2'>
                                <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>Your Archon identity</h1>
                                <p className='max-w-2xl text-sm text-muted-foreground sm:text-base'>
                                    A polished personal space for your account, recent activity, and workspace context.
                                    The page now reads real backend data instead of placeholder cards.
                                </p>
                            </div>
                            <div className='flex flex-wrap gap-3'>
                                <Button asChild className='rounded-full px-5'>
                                    <Link href='/settings'>Open settings</Link>
                                </Button>
                                <Button variant='outline' className='rounded-full px-5' asChild>
                                    <Link href='/projects'>View projects</Link>
                                </Button>
                            </div>
                        </div>

                        <Card className='border-border/60 bg-background/70 backdrop-blur'>
                            <CardContent className='p-6'>
                                <div className='flex items-center gap-4'>
                                    <Avatar className='h-16 w-16 shrink-0 ring-4 ring-primary/10'>
                                        <AvatarImage src={user?.avatar_url || ''} alt={user?.username || ''} />
                                        <AvatarFallback className='text-xl font-semibold'>{initials}</AvatarFallback>
                                    </Avatar>
                                    <div className='min-w-0 space-y-1'>
                                        <div className='flex items-center gap-2'>
                                            <h2 className='truncate text-2xl font-semibold'>{user?.full_name || user?.username}</h2>
                                            <Badge className='rounded-full'>Verified</Badge>
                                        </div>
                                        <p className='truncate text-sm text-muted-foreground'>{user?.email}</p>
                                        <p className='text-xs text-muted-foreground'>Member since {joinedAgo}</p>
                                    </div>
                                </div>

                                <Separator className='my-5' />

                                <div className='grid gap-3 sm:grid-cols-2'>
                                    <div className='rounded-2xl border bg-muted/30 p-4'>
                                        <div className='flex items-center gap-2 text-sm font-medium'>
                                            <Fingerprint className='h-4 w-4 text-primary' /> Account status
                                        </div>
                                        <p className='mt-2 text-xs text-muted-foreground'>
                                            Email-based authentication with name and avatar synced from the backend.
                                        </p>
                                    </div>
                                    <div className='rounded-2xl border bg-muted/30 p-4'>
                                        <div className='flex items-center gap-2 text-sm font-medium'>
                                            <Activity className='h-4 w-4 text-primary' /> Recent activity
                                        </div>
                                        <p className='mt-2 text-xs text-muted-foreground'>
                                            {stats?.recent_activity ?? 0} backend events tracked across this account.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Tabs defaultValue='overview' className='space-y-6'>
                    <TabsList className='grid h-11 w-full grid-cols-3 rounded-2xl p-1'>
                        <TabsTrigger value='overview' className='rounded-xl'>Overview</TabsTrigger>
                        <TabsTrigger value='activity' className='rounded-xl'>Activity</TabsTrigger>
                        <TabsTrigger value='access' className='rounded-xl'>Access</TabsTrigger>
                    </TabsList>

                    <TabsContent value='overview' className='space-y-6'>
                        <div className='grid gap-6 lg:grid-cols-[1.05fr_0.95fr]'>
                            <Card className='border-border/60'>
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'>
                                        <Sparkles className='h-4 w-4 text-primary' /> Experience highlights
                                    </CardTitle>
                                    <CardDescription>What your current Archon workspace already gives you.</CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-3'>
                                    {highlights.map((item) => {
                                        const Icon = item.icon
                                        return (
                                            <div key={item.label} className='flex items-start gap-3 rounded-2xl border bg-background p-4'>
                                                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                                                    <Icon className='h-5 w-5' />
                                                </div>
                                                <div>
                                                    <div className='font-medium'>{item.label}</div>
                                                    <div className='mt-1 text-sm text-muted-foreground'>{item.description}</div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>

                            <Card className='border-border/60'>
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'>
                                        <BadgeCheck className='h-4 w-4 text-primary' /> Workspace snapshot
                                    </CardTitle>
                                    <CardDescription>Useful counts and the latest project context from the backend.</CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-4'>
                                    <div className='grid gap-3 sm:grid-cols-2'>
                                        <div className='rounded-2xl border bg-muted/30 p-4'>
                                            <div className='text-xs text-muted-foreground'>Projects</div>
                                            <div className='mt-1 text-2xl font-bold'>{stats?.total_projects ?? 0}</div>
                                        </div>
                                        <div className='rounded-2xl border bg-muted/30 p-4'>
                                            <div className='text-xs text-muted-foreground'>Active projects</div>
                                            <div className='mt-1 text-2xl font-bold'>{stats?.active_projects ?? 0}</div>
                                        </div>
                                        <div className='rounded-2xl border bg-background p-4'>
                                            <div className='text-xs text-muted-foreground'>Recent sessions</div>
                                            <div className='mt-1 text-2xl font-bold'>{stats?.recent_sessions ?? 0}</div>
                                        </div>
                                        <div className='rounded-2xl border bg-background p-4'>
                                            <div className='text-xs text-muted-foreground'>Archived projects</div>
                                            <div className='mt-1 text-2xl font-bold'>{stats?.archived_projects ?? 0}</div>
                                        </div>
                                    </div>

                                    <div className='rounded-2xl border bg-background p-4'>
                                        <div className='flex items-center justify-between gap-3'>
                                            <div>
                                                <div className='text-xs text-muted-foreground'>Current project</div>
                                                <div className='mt-1 font-medium'>{currentProject?.name || 'No current project'}</div>
                                            </div>
                                            {currentProject ? (
                                                <Badge variant={currentProject.status === 'active' ? 'default' : 'secondary'} className='rounded-full'>
                                                    {currentProject.status}
                                                </Badge>
                                            ) : null}
                                        </div>
                                        {currentProject?.description ? (
                                            <p className='mt-2 line-clamp-2 text-sm text-muted-foreground'>
                                                {currentProject.description}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div>
                                        <div className='mb-3 text-sm font-medium'>Recent projects</div>
                                        <div className='space-y-2'>
                                            {recentProjects.length > 0 ? (
                                                recentProjects.map((project) => (
                                                    <Link
                                                        key={project.id}
                                                        href={`/projects/${project.id}`}
                                                        className='group flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 transition hover:shadow-sm'
                                                    >
                                                        <div className='min-w-0'>
                                                            <div className='truncate font-medium'>{project.name}</div>
                                                            <div className='text-xs text-muted-foreground'>
                                                                Updated {formatTime(project.updated_at)}
                                                            </div>
                                                        </div>
                                                        <ArrowUpRight className='h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
                                                    </Link>
                                                ))
                                            ) : (
                                                <div className='rounded-2xl border border-dashed p-4 text-sm text-muted-foreground'>
                                                    No projects yet. Create one in the dashboard to populate the profile.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value='activity' className='space-y-6'>
                        <div className='grid gap-6 lg:grid-cols-[1.05fr_0.95fr]'>
                            <Card className='border-border/60'>
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'>
                                        <Clock3 className='h-4 w-4 text-primary' /> Recent activity
                                    </CardTitle>
                                    <CardDescription>Backend events for account and project actions.</CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-4'>
                                    {recentActivity.length > 0 ? (
                                        <div className='max-h-[32rem] space-y-4 overflow-y-auto pr-2'>
                                            {recentActivity.map((item, index) => (
                                                <div key={item.id} className='flex gap-4'>
                                                    <div className='flex flex-col items-center'>
                                                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary'>
                                                            {index + 1}
                                                        </div>
                                                        {index < recentActivity.length - 1 ? <div className='my-2 h-full w-px bg-border' /> : null}
                                                    </div>
                                                    <div className='flex-1 rounded-2xl border bg-background p-4'>
                                                        <div className='flex flex-wrap items-center justify-between gap-2'>
                                                            <div className='font-medium'>{item.activity_label || item.activity_type}</div>
                                                            <Badge variant='outline' className='rounded-full'>
                                                                {formatTime(item.created_at)}
                                                            </Badge>
                                                        </div>
                                                        <p className='mt-2 text-sm text-muted-foreground'>
                                                            {item.description || 'Backend recorded this event.'}
                                                        </p>
                                                        <div className='mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground'>
                                                            {item.project_name ? (
                                                                <span className='rounded-full border px-2 py-1'>Project: {item.project_name}</span>
                                                            ) : null}
                                                            <span className='rounded-full border px-2 py-1'>{item.activity_type}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className='rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground'>
                                            No backend activity has been recorded yet. Once you create projects or update your account,
                                            the feed will fill automatically.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className='border-border/60'>
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'>
                                        <Activity className='h-4 w-4 text-primary' /> Recent sessions
                                    </CardTitle>
                                    <CardDescription>Latest agent sessions connected to your projects.</CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-3'>
                                    {recentSessions.length > 0 ? (
                                        <div className='max-h-[32rem] space-y-3 overflow-y-auto pr-2'>
                                            {recentSessions.map((session) => (
                                                <div key={session.id} className='rounded-2xl border bg-muted/20 p-4'>
                                                    <div className='flex items-start justify-between gap-3'>
                                                        <div className='min-w-0'>
                                                            <div className='truncate font-medium'>{session.session_name}</div>
                                                            <div className='text-xs text-muted-foreground'>
                                                                {session.project_name || 'Unknown project'} · {session.agent_type}
                                                            </div>
                                                        </div>
                                                        <Badge variant='secondary' className='rounded-full capitalize'>
                                                            {session.status}
                                                        </Badge>
                                                    </div>
                                                    <div className='mt-2 text-xs text-muted-foreground'>
                                                        Updated {formatTime(session.last_activity_at || session.updated_at)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className='rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground'>
                                            No sessions found yet.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value='access' className='space-y-6'>
                        <div className='grid gap-6 lg:grid-cols-2'>
                            <Card className='border-border/60'>
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'>
                                        <BadgeCheck className='h-4 w-4 text-primary' /> Account access
                                    </CardTitle>
                                    <CardDescription>Useful shortcuts for account and workspace management.</CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-3'>
                                    <div className='flex items-center justify-between rounded-2xl border bg-muted/30 p-4'>
                                        <div>
                                            <div className='font-medium'>Profile settings</div>
                                            <div className='text-xs text-muted-foreground'>Update your display name and password.</div>
                                        </div>
                                        <Button variant='ghost' size='sm' asChild className='gap-2'>
                                            <Link href='/settings'>Open <ArrowUpRight className='h-3.5 w-3.5' /></Link>
                                        </Button>
                                    </div>
                                    <div className='flex items-center justify-between rounded-2xl border bg-muted/30 p-4'>
                                        <div>
                                            <div className='font-medium'>Workspace settings</div>
                                            <div className='text-xs text-muted-foreground'>Appearance, project actions, and workspace behavior.</div>
                                        </div>
                                        <Button variant='ghost' size='sm' asChild className='gap-2'>
                                            <Link href='/settings'>Manage <ArrowUpRight className='h-3.5 w-3.5' /></Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className='border-border/60'>
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'>
                                        <Bell className='h-4 w-4 text-primary' /> Security and notifications
                                    </CardTitle>
                                    <CardDescription>Reserved space for the backend account features you’ll connect later.</CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-3'>
                                    <div className='rounded-2xl border bg-background p-4'>
                                        <div className='flex items-center justify-between'>
                                            <div className='font-medium'>Two-factor authentication</div>
                                            <Badge variant='secondary' className='rounded-full'>Planned</Badge>
                                        </div>
                                        <p className='mt-2 text-sm text-muted-foreground'>
                                            Secure sign-ins with a future backend-backed 2FA flow.
                                        </p>
                                    </div>
                                    <div className='rounded-2xl border bg-background p-4'>
                                        <div className='flex items-center justify-between'>
                                            <div className='font-medium'>Active sessions</div>
                                            <Badge variant='secondary' className='rounded-full'>Planned</Badge>
                                        </div>
                                        <p className='mt-2 text-sm text-muted-foreground'>
                                            Review devices and logins once the session APIs are connected.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
