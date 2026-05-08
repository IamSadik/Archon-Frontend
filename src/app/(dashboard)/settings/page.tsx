'use client'

import type { ChangeEvent, MouseEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
    ArrowUpRight,
    Bell,
    Bot,
    BookOpen,
    ChevronRight,
    CloudCog,
    Code2,
    Database,
    Fingerprint,
    FolderCog,
    FolderGit2,
    FolderOpen,
    Image as ImageIcon,
    Minus,
    MoonStar,
    Palette,
    Plus,
    Save,
    Shield,
    Sparkles,
    SlidersHorizontal,
    SunMedium,
    TerminalSquare,
    UserRound,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { authService, projectService } from '@/services'
import { useProjects } from '@/hooks/useProjects'
import { useWorkspacePreferences } from '@/hooks/useWorkspacePreferences'
import {
    contrastShellClasses,
    folderIconOptions,
    treeAccentClasses,
    treeAccentOptions,
    treeDensityClasses,
    treeDensityOptions,
    workspaceContrastOptions,
    workspaceEditorThemeOptions,
    type FolderIconStyle,
} from '@/lib/workspace-preferences'

interface ProfileFormValues {
    full_name: string
}

interface PasswordFormValues {
    current_password: string
    new_password: string
    confirm_password: string
}

const appearanceModes = [
    { id: 'system', label: 'System', description: 'Follow the device theme.', icon: CloudCog },
    { id: 'light', label: 'Light', description: 'Bright and crisp workspace.', icon: SunMedium },
    { id: 'dark', label: 'Dark', description: 'Deep mode for focused work.', icon: MoonStar },
] as const

const workspaceModes = [
    { icon: Sparkles, title: 'AI guidance', description: 'Balanced assistant behavior with code-aware help.' },
    { icon: TerminalSquare, title: 'Editor first', description: 'Projects, file tree, and editor are kept in sync.' },
    { icon: Code2, title: 'Delivery mode', description: 'Planning and implementation stay connected.' },
] as const

const MIN_EDITOR_FONT_SIZE = 12
const MAX_EDITOR_FONT_SIZE = 20

export default function SettingsPage() {
    const queryClient = useQueryClient()
    const { setTheme, theme, resolvedTheme } = useTheme()
    const { preferences: workspacePreferences, updatePreferences } = useWorkspacePreferences()
    const { data: user, isLoading: isUserLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: authService.getCurrentUser,
        retry: false,
    })
    const { data: projects, isLoading: isProjectsLoading } = useProjects()

    const [appearance, setAppearance] = useState<'system' | 'light' | 'dark'>('system')
    const [avatarFile, setAvatarFile] = useState<File | null>(null)

    const profileForm = useForm<ProfileFormValues>({ defaultValues: { full_name: '' } })
    const passwordForm = useForm<PasswordFormValues>({
        defaultValues: { current_password: '', new_password: '', confirm_password: '' },
    })

    const currentProject = useMemo(() => {
        const list = Array.isArray(projects) ? projects : []
        const activeProjects = list.filter((project) => project.status === 'active')
        const sorted = [...(activeProjects.length > 0 ? activeProjects : list)].sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )
        return sorted[0] || null
    }, [projects])

    const recentProjects = useMemo(() => {
        const list = Array.isArray(projects) ? projects : []
        return [...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5)
    }, [projects])

    const joinedAgo = user?.date_joined ? formatDistanceToNow(new Date(user.date_joined), { addSuffix: true }) : 'recently'
    const editorFontSize = workspacePreferences.editorFontSize ?? 14
    const activeEditorTheme = workspacePreferences.editorTheme === 'system' ? (resolvedTheme === 'dark' ? 'archon-dark' : 'archon-light') : workspacePreferences.editorTheme
    const editorThemeLabel = workspacePreferences.editorTheme === 'system' ? `system (${resolvedTheme === 'dark' ? 'dark' : 'light'})` : workspacePreferences.editorTheme

    useEffect(() => {
        if (user) profileForm.reset({ full_name: user.full_name || '' })
    }, [user, profileForm])

    useEffect(() => {
        if (theme === 'dark' || theme === 'light' || theme === 'system') setAppearance(theme)
    }, [theme])

    const updateProfileMutation = useMutation({
        mutationFn: (data: { full_name?: string }) => authService.updateProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentUser'] })
            toast.success('Profile updated')
        },
        onError: (error: any) => toast.error(error?.response?.data?.error || 'Could not update profile'),
    })

    const uploadAvatarMutation = useMutation({
        mutationFn: (file: File) => authService.uploadAvatar(file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentUser'] })
            queryClient.invalidateQueries({ queryKey: ['profileOverview'] })
            setAvatarFile(null)
            toast.success('Avatar updated')
        },
        onError: (error: any) => toast.error(error?.response?.data?.error || 'Could not upload avatar'),
    })

    const changePasswordMutation = useMutation({
        mutationFn: authService.changePassword,
        onSuccess: () => {
            passwordForm.reset()
            toast.success('Password changed')
        },
        onError: (error: any) => toast.error(error?.response?.data?.error || 'Could not change password'),
    })

    const archiveProjectMutation = useMutation({
        mutationFn: (projectId: string) => projectService.archiveProject(projectId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            toast.success('Project archived')
        },
        onError: (error: any) => toast.error(error?.response?.data?.error || 'Could not archive project'),
    })

    const deleteProjectMutation = useMutation({
        mutationFn: (projectId: string) => projectService.deleteProject(projectId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            toast.success('Project deleted')
        },
        onError: (error: any) => toast.error(error?.response?.data?.error || 'Could not delete project'),
    })

    const getAvatarFallback = (name?: string, username?: string) => {
        const source = (name || username || 'User').trim()
        const parts = source.split(/\s+/).filter(Boolean)
        if (parts.length === 0) return 'U'
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
        return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    }

    const handleThemeChange = (mode: 'system' | 'light' | 'dark') => {
        setAppearance(mode)
        setTheme(mode)
    }

    const adjustEditorFontSize = (delta: number) => {
        updatePreferences({ editorFontSize: Math.min(MAX_EDITOR_FONT_SIZE, Math.max(MIN_EDITOR_FONT_SIZE, editorFontSize + delta)) })
    }

    const onProfileSubmit = (values: ProfileFormValues) => updateProfileMutation.mutate({ full_name: values.full_name.trim() })

    const onPasswordSubmit = (values: PasswordFormValues) => {
        changePasswordMutation.mutate({
            old_password: values.current_password,
            new_password: values.new_password,
            new_password_confirm: values.confirm_password,
        })
    }

    const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
        setAvatarFile(event.target.files?.[0] || null)
    }

    const handleAvatarUpload = () => {
        if (!avatarFile) {
            toast.error('Choose an image first')
            return
        }
        uploadAvatarMutation.mutate(avatarFile)
    }

    const renderSmartFolderGlyph = (folderName: string) => {
        const normalized = folderName.toLowerCase()
        if (/^(src|components|ui|widgets|layouts|views|pages)$/.test(normalized)) return <Code2 className='h-4 w-4' />
        if (/^(app|api|server|route|routes|services|controllers?|endpoints?)$/.test(normalized)) return <FolderGit2 className='h-4 w-4' />
        if (/^(config|settings|infra|meta|admin|lib|utils|shared|common|core|helpers?)$/.test(normalized)) return <FolderCog className='h-4 w-4' />
        if (/^(docs?|readme|guide|manual|book|knowledge)$/.test(normalized)) return <BookOpen className='h-4 w-4' />
        if (/^(public|static|assets?|images?|img|media|icons?)$/.test(normalized)) return <ImageIcon className='h-4 w-4' />
        if (/^(test|tests|specs?|__tests__|e2e|playwright|cypress)$/.test(normalized)) return <Sparkles className='h-4 w-4' />
        if (/^(db|database|data|schema|migrations?)$/.test(normalized)) return <Database className='h-4 w-4' />
        if (/^(auth|security|private|secret|lock)$/.test(normalized)) return <Shield className='h-4 w-4' />
        if (/^(scripts?|cli|bin|tools?)$/.test(normalized)) return <TerminalSquare className='h-4 w-4' />
        return <FolderOpen className='h-4 w-4' />
    }

    const renderFolderIcon = (style: FolderIconStyle, folderName: string) => {
        switch (style) {
            case 'open':
                return <FolderGit2 className='h-4 w-4' />
            case 'emoji':
                return renderSmartFolderGlyph(folderName)
            case 'minimal':
                return <span className='h-3.5 w-3.5 rounded-sm border border-current/60' />
            default:
                return <FolderOpen className='h-4 w-4' />
        }
    }

    const treeDensityConfig = treeDensityClasses[workspacePreferences.treeDensity]
    const treeAccentClass = treeAccentClasses[workspacePreferences.treeAccent]

    const getEditorPreviewClasses = () => {
        switch (activeEditorTheme) {
            case 'archon-dark':
                return 'border-slate-700 bg-[#020817] text-slate-100'
            case 'archon-midnight':
                return 'border-slate-700 bg-[#070b1a] text-cyan-50'
            case 'archon-dracula':
                return 'border-slate-700 bg-[#1e1f29] text-fuchsia-50'
            case 'archon-solarized':
                return 'border-[#eee8d5] bg-[#fdf6e3] text-[#073642]'
            case 'archon-high-contrast':
                return 'border-white/40 bg-black text-white'
            case 'archon-nord':
                return 'border-slate-600 bg-[#2e3440] text-[#eceff4]'
            case 'archon-gruvbox':
                return 'border-stone-600 bg-[#282828] text-[#ebdbb2]'
            case 'archon-tokyo-night':
                return 'border-indigo-950 bg-[#1a1b26] text-[#c0caf5]'
            case 'archon-catppuccin':
                return 'border-slate-700 bg-[#1e1e2e] text-[#cdd6f4]'
            case 'archon-light':
            default:
                return 'border-slate-200 bg-white text-slate-800'
        }
    }

    const getEditorTokenClass = (kind: 'comment' | 'keyword' | 'string' | 'title' | 'accent') => {
        switch (activeEditorTheme) {
            case 'archon-dark':
                return { comment: 'text-slate-400', keyword: 'text-sky-400', string: 'text-emerald-400', title: 'text-cyan-300', accent: 'text-orange-300' }[kind]
            case 'archon-midnight':
                return { comment: 'text-slate-500', keyword: 'text-cyan-300', string: 'text-lime-300', title: 'text-violet-200', accent: 'text-amber-300' }[kind]
            case 'archon-dracula':
                return { comment: 'text-slate-400', keyword: 'text-violet-300', string: 'text-green-300', title: 'text-pink-200', accent: 'text-yellow-200' }[kind]
            case 'archon-solarized':
                return { comment: 'text-[#93a1a1]', keyword: 'text-[#268bd2]', string: 'text-[#2aa198]', title: 'text-[#b58900]', accent: 'text-[#cb4b16]' }[kind]
            case 'archon-high-contrast':
                return { comment: 'text-gray-300', keyword: 'text-yellow-300', string: 'text-green-300', title: 'text-white', accent: 'text-cyan-300' }[kind]
            case 'archon-nord':
                return { comment: 'text-slate-400', keyword: 'text-sky-300', string: 'text-emerald-300', title: 'text-slate-100', accent: 'text-fuchsia-300' }[kind]
            case 'archon-gruvbox':
                return { comment: 'text-stone-400', keyword: 'text-red-400', string: 'text-lime-300', title: 'text-amber-200', accent: 'text-orange-300' }[kind]
            case 'archon-tokyo-night':
                return { comment: 'text-slate-400', keyword: 'text-blue-300', string: 'text-lime-300', title: 'text-indigo-100', accent: 'text-rose-300' }[kind]
            case 'archon-catppuccin':
                return { comment: 'text-slate-400', keyword: 'text-violet-300', string: 'text-green-300', title: 'text-slate-100', accent: 'text-pink-300' }[kind]
            case 'archon-light':
            default:
                return { comment: 'text-slate-500', keyword: 'text-blue-600', string: 'text-emerald-600', title: 'text-slate-900', accent: 'text-rose-600' }[kind]
        }
    }

    const handleArchiveProject = (projectId: string, event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        archiveProjectMutation.mutate(projectId)
    }

    const handleDeleteProject = (projectId: string, event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        if (!window.confirm('Delete this project permanently?')) return
        deleteProjectMutation.mutate(projectId)
    }

    if (isUserLoading) {
        return (
            <div className='flex min-h-[70vh] items-center justify-center'>
                <div className='flex items-center gap-2 text-muted-foreground'>
                    <SlidersHorizontal className='h-5 w-5 animate-pulse' /> Loading settings...
                </div>
            </div>
        )
    }

    return (
        <div className='min-h-full bg-gradient-to-b from-background via-background to-muted/20'>
            <div className='mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8'>
                <div className='overflow-hidden rounded-3xl border bg-card shadow-sm'>
                    <div className='grid gap-6 p-6 lg:grid-cols-[1.25fr_0.75fr] lg:p-8'>
                        <div className='space-y-4'>
                            <div className='flex flex-wrap items-center gap-2'>
                                <Badge variant='secondary' className='gap-1 rounded-full px-3 py-1'><Sparkles className='h-3.5 w-3.5' /> Settings</Badge>
                                <Badge variant='outline' className='rounded-full px-3 py-1'>Frontend ready</Badge>
                            </div>
                            <div className='space-y-2'>
                                <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>Control your Archon workspace</h1>
                                <p className='max-w-2xl text-sm text-muted-foreground sm:text-base'>
                                    Change your display name, update your password, switch themes, and manage projects from one polished place.
                                </p>
                            </div>
                            <div className='grid gap-3 sm:grid-cols-3'>
                                {workspaceModes.map((item) => {
                                    const Icon = item.icon
                                    return (
                                        <div key={item.title} className='flex items-start gap-3 rounded-2xl border bg-background/70 p-4'>
                                            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary'><Icon className='h-5 w-5' /></div>
                                            <div className='space-y-1'><div className='font-medium'>{item.title}</div><p className='text-xs text-muted-foreground'>{item.description}</p></div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <Card className='border-border/60 bg-background/70 backdrop-blur'>
                            <CardContent className='p-6'>
                                <div className='flex items-center gap-4'>
                                    <Avatar className='h-16 w-16 ring-4 ring-primary/10'>
                                        <AvatarImage src={user?.avatar_url || ''} alt={user?.username || ''} />
                                        <AvatarFallback className='text-lg font-semibold'>{getAvatarFallback(user?.full_name, user?.username)}</AvatarFallback>
                                    </Avatar>
                                    <div className='min-w-0 space-y-1'>
                                        <div className='flex items-center gap-2'><h2 className='truncate text-xl font-semibold'>{user?.full_name || user?.username}</h2><Badge className='rounded-full'>Active</Badge></div>
                                        <p className='truncate text-sm text-muted-foreground'>{user?.email}</p>
                                        <p className='text-xs text-muted-foreground'>Member since {joinedAgo}</p>
                                    </div>
                                </div>
                                <Separator className='my-5' />
                                <div className='grid gap-3 sm:grid-cols-2'>
                                    <div className='rounded-2xl border bg-muted/30 p-3'><div className='text-xs text-muted-foreground'>Current project</div><div className='mt-1 font-medium'>{currentProject?.name || 'No current project'}</div></div>
                                    <div className='rounded-2xl border bg-muted/30 p-3'><div className='text-xs text-muted-foreground'>Theme</div><div className='mt-1 font-medium capitalize'>{appearance}</div></div>
                                </div>
                                <Separator className='my-5' />
                                <div className='space-y-3'>
                                    <div className='text-sm font-medium'>Avatar</div>
                                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center'><Input type='file' accept='image/*' onChange={handleAvatarChange} /><Button type='button' className='gap-2 rounded-full px-5' onClick={handleAvatarUpload} disabled={!avatarFile || uploadAvatarMutation.isPending}>{uploadAvatarMutation.isPending ? <SlidersHorizontal className='h-4 w-4 animate-spin' /> : <Save className='h-4 w-4' />}Upload avatar</Button></div>
                                    <p className='text-xs text-muted-foreground'>JPG, PNG, WEBP, or GIF. If you do not upload one, the avatar circle will show your name initials.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Tabs defaultValue='profile' className='space-y-6'>
                    <TabsList className='grid h-11 w-full grid-cols-4 rounded-2xl p-1'>
                        <TabsTrigger value='profile' className='rounded-xl'>Profile</TabsTrigger>
                        <TabsTrigger value='workspace' className='rounded-xl'>Workspace</TabsTrigger>
                        <TabsTrigger value='experience' className='rounded-xl'>Experience</TabsTrigger>
                        <TabsTrigger value='security' className='rounded-xl'>Security</TabsTrigger>
                    </TabsList>

                    <TabsContent value='profile' className='space-y-6'>
                        <div className='grid gap-6 lg:grid-cols-2'>
                            <Card className='border-border/60'>
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'><UserRound className='h-4 w-4 text-primary' /> Profile details</CardTitle>
                                    <CardDescription>Update your display name.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form className='space-y-5' onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                                        <div className='space-y-2'><Label htmlFor='full_name'>Display name</Label><Input id='full_name' {...profileForm.register('full_name')} placeholder='Your display name' /></div>
                                        <div className='space-y-2'><Label htmlFor='email'>Email</Label><Input id='email' value={user?.email || ''} disabled /><p className='text-xs text-muted-foreground'>Email remains managed by authentication.</p></div>
                                        <div className='flex items-center justify-end'><Button type='submit' disabled={updateProfileMutation.isPending} className='gap-2 rounded-full px-5'>{updateProfileMutation.isPending ? <SlidersHorizontal className='h-4 w-4 animate-spin' /> : <Save className='h-4 w-4' />}Save name</Button></div>
                                    </form>
                                </CardContent>
                            </Card>
                            <Card className='border-border/60'>
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'><Shield className='h-4 w-4 text-primary' /> Password</CardTitle>
                                    <CardDescription>Change your password from the frontend and backend now.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form className='space-y-5' onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                                        <div className='space-y-2'><Label htmlFor='current_password'>Current password</Label><Input id='current_password' type='password' {...passwordForm.register('current_password')} /></div>
                                        <div className='space-y-2'><Label htmlFor='new_password'>New password</Label><Input id='new_password' type='password' {...passwordForm.register('new_password')} /></div>
                                        <div className='space-y-2'><Label htmlFor='confirm_password'>Confirm new password</Label><Input id='confirm_password' type='password' {...passwordForm.register('confirm_password')} /></div>
                                        <div className='flex items-center justify-end'><Button type='submit' disabled={changePasswordMutation.isPending} className='gap-2 rounded-full px-5'>{changePasswordMutation.isPending ? <SlidersHorizontal className='h-4 w-4 animate-spin' /> : <Fingerprint className='h-4 w-4' />}Update password</Button></div>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value='workspace' className='space-y-6'>
                        <div className='grid gap-6 lg:grid-cols-[1.05fr_0.95fr]'>
                            <Card className='border-border/60'>
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'><FolderGit2 className='h-4 w-4 text-primary' /> Current project snapshot</CardTitle>
                                    <CardDescription>Jump into the latest or active project and manage it from here.</CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-4'>
                                    {isProjectsLoading ? <div className='flex items-center gap-2 text-sm text-muted-foreground'><SlidersHorizontal className='h-4 w-4 animate-spin' /> Loading projects...</div> : recentProjects.length > 0 ? recentProjects.map((project) => (
                                        <Link key={project.id} href={`/projects/${project.id}`} className='group block rounded-2xl border bg-background p-4 transition hover:shadow-md'>
                                            <div className='flex items-start justify-between gap-4'>
                                                <div className='min-w-0 space-y-2'>
                                                    <div className='flex items-center gap-2'><FolderGit2 className='h-4 w-4 text-primary' /><h3 className='truncate font-semibold'>{project.name}</h3><Badge variant={project.status === 'active' ? 'default' : 'secondary'} className='rounded-full'>{project.status}</Badge></div>
                                                    <p className='line-clamp-2 text-sm text-muted-foreground'>{project.description || 'No description provided.'}</p>
                                                    <div className='flex flex-wrap items-center gap-3 text-xs text-muted-foreground'><span>{project.language || 'language not set'}</span><span>{project.framework || 'framework not set'}</span><span>Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}</span></div>
                                                </div>
                                                <ArrowUpRight className='h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
                                            </div>
                                        </Link>
                                    )) : <div className='rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground'>No projects yet. Create one in the dashboard to see it here.</div>}
                                </CardContent>
                            </Card>
                            <Card className='border-border/60'>
                                <CardHeader>
                                    <CardTitle>Project actions</CardTitle>
                                    <CardDescription>Archive or delete projects directly from settings.</CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-3'>
                                    {recentProjects.length > 0 ? recentProjects.map((project) => (
                                        <div key={project.id} className='rounded-2xl border bg-muted/20 p-4'>
                                            <div className='flex items-center justify-between gap-3'><div className='min-w-0'><div className='truncate font-medium'>{project.name}</div><div className='text-xs text-muted-foreground'>{project.status === 'active' ? 'Active project' : 'Archived project'}</div></div><Badge variant='outline' className='rounded-full'>{project.status}</Badge></div>
                                            <div className='mt-3 flex flex-wrap gap-2'><Button type='button' variant='outline' size='sm' className='gap-2 rounded-full' onClick={(event) => handleArchiveProject(project.id, event)} disabled={archiveProjectMutation.isPending}>Archive</Button><Button type='button' variant='destructive' size='sm' className='gap-2 rounded-full' onClick={(event) => handleDeleteProject(project.id, event)} disabled={deleteProjectMutation.isPending}>Delete</Button></div>
                                        </div>
                                    )) : <div className='rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground'>No projects available for actions.</div>}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value='experience' className='space-y-6'>
                        <Card className='border-border/60'>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-2'><Palette className='h-4 w-4 text-primary' /> Workspace appearance</CardTitle>
                                <CardDescription>Control the overall workspace feel without touching the app theme.</CardDescription>
                            </CardHeader>
                            <CardContent className='space-y-4'>
                                {appearanceModes.map((mode) => {
                                    const Icon = mode.icon
                                    const active = appearance === mode.id
                                    return (
                                        <button key={mode.id} type='button' onClick={() => handleThemeChange(mode.id)} className={`flex w-full items-center justify-between rounded-3xl border px-4 py-4 text-left transition ${active ? 'border-primary bg-primary/5 shadow-sm' : 'bg-background hover:bg-muted/40'}`}>
                                            <div className='flex items-center gap-4'><div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-muted'><Icon className='h-4 w-4' /></div><div><div className='font-semibold'>{mode.label}</div><div className='text-xs text-muted-foreground'>{mode.description}</div></div></div>
                                            <ChevronRight className='h-4 w-4 text-muted-foreground' />
                                        </button>
                                    )
                                })}
                                <div className={`rounded-3xl border p-4 ${contrastShellClasses[workspacePreferences.contrast]}`}>
                                    <div className='flex items-center justify-between gap-3'><div><div className='text-sm font-medium'>Live workspace style</div><div className='text-xs text-muted-foreground'>Contrast, tree density, and editor theme preview.</div></div><Badge variant='secondary' className='rounded-full capitalize'>{workspacePreferences.contrast}</Badge></div>
                                    <div className='mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
                                        <div className='rounded-2xl border bg-background p-3 text-sm'><div className='text-xs text-muted-foreground'>Editor</div><div className='mt-1 font-semibold'>{editorThemeLabel}</div></div>
                                        <div className='rounded-2xl border bg-background p-3 text-sm'><div className='text-xs text-muted-foreground'>Font size</div><div className='mt-1 font-semibold'>{editorFontSize}px</div></div>
                                        <div className='rounded-2xl border bg-background p-3 text-sm'><div className='text-xs text-muted-foreground'>Tree density</div><div className='mt-1 font-semibold capitalize'>{workspacePreferences.treeDensity}</div></div>
                                        <div className='rounded-2xl border bg-background p-3 text-sm'><div className='text-xs text-muted-foreground'>Tree accents</div><div className='mt-1 font-semibold capitalize'>{workspacePreferences.treeAccent}</div></div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className='border-border/60'>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-2'><Code2 className='h-4 w-4 text-primary' /> Code editor presets</CardTitle>
                                <CardDescription>Pick a prebuilt editor theme, then tune the preview instantly beside it.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className='grid gap-6 xl:grid-cols-[0.92fr_1.08fr]'>
                                    <div className='rounded-3xl border bg-background p-4 shadow-sm'>
                                        <div className='mb-4 flex items-center justify-between gap-3'><div><div className='text-sm font-medium'>Editor controls</div><div className='text-xs text-muted-foreground'>Choose the editor tone and adjust size.</div></div><Badge variant='secondary' className='rounded-full'>{editorFontSize}px</Badge></div>
                                        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2'>
                                            {workspaceEditorThemeOptions.map((option) => {
                                                const active = workspacePreferences.editorTheme === option.value
                                                return (
                                                    <button key={option.value} type='button' onClick={() => updatePreferences({ editorTheme: option.value })} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-primary bg-primary/5 shadow-sm' : 'bg-background hover:bg-muted/40'}`}>
                                                        <div className='flex items-center justify-between gap-2'><div className='font-semibold'>{option.label}</div><Badge variant={active ? 'default' : 'secondary'} className='rounded-full'>{active ? 'Active' : 'Theme'}</Badge></div>
                                                        <div className='mt-2 text-xs text-muted-foreground'>{option.description}</div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        <div className='mt-4 rounded-2xl border bg-muted/20 p-4'>
                                            <div className='flex items-center justify-between gap-3'>
                                                <div>
                                                    <div className='font-medium'>Font size</div>
                                                    <div className='text-xs text-muted-foreground'>Increase or decrease the editor text size.</div>
                                                </div>
                                                <div className='flex items-center gap-2'>
                                                    <Button type='button' variant='outline' size='icon' className='h-9 w-9 rounded-full' onClick={() => adjustEditorFontSize(-1)} disabled={editorFontSize <= MIN_EDITOR_FONT_SIZE}>
                                                        <Minus className='h-4 w-4' />
                                                    </Button>
                                                    <Badge variant='secondary' className='min-w-16 justify-center rounded-full px-3'>{editorFontSize}px</Badge>
                                                    <Button type='button' variant='outline' size='icon' className='h-9 w-9 rounded-full' onClick={() => adjustEditorFontSize(1)} disabled={editorFontSize >= MAX_EDITOR_FONT_SIZE}>
                                                        <Plus className='h-4 w-4' />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className='mt-4 grid gap-2 sm:grid-cols-2'>
                                                <button
                                                    type='button'
                                                    onClick={() => updatePreferences({ showLineNumbers: !workspacePreferences.showLineNumbers })}
                                                    className={`rounded-2xl border px-3 py-3 text-left transition ${workspacePreferences.showLineNumbers ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/50'}`}
                                                >
                                                    <div className='text-sm font-medium'>Line numbers</div>
                                                    <div className='mt-1 text-[11px] text-muted-foreground'>{workspacePreferences.showLineNumbers ? 'On' : 'Off'}</div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className='rounded-3xl border bg-background p-4 shadow-sm'>
                                        <div className='mb-4 flex items-center justify-between gap-3'><div><div className='text-sm font-medium'>Code editor preview</div><div className='text-xs text-muted-foreground'>Live preview updates instantly.</div></div><Badge variant='outline' className='rounded-full'>{editorFontSize}px</Badge></div>
                                        <div className={`overflow-hidden rounded-3xl border ${getEditorPreviewClasses()}`}>
                                            <div className='flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs'><div className='flex items-center gap-2'><div className='h-3 w-3 rounded-full bg-red-400/80' /><div className='h-3 w-3 rounded-full bg-yellow-400/80' /><div className='h-3 w-3 rounded-full bg-green-400/80' /><span className='ml-2 font-medium capitalize'>{editorThemeLabel}</span></div></div>
                                            <div className='flex min-w-0'>
                                                {workspacePreferences.showLineNumbers ? <div className='w-14 shrink-0 border-r border-current/10 bg-black/10 px-3 py-4 font-mono text-right text-[11px] leading-7 opacity-60'><div>1</div><div>2</div><div>3</div><div>4</div><div>5</div></div> : null}
                                                <div className='min-w-0 space-y-2 px-4 py-4 font-mono leading-7 whitespace-pre-wrap break-words' style={{ fontSize: `${editorFontSize}px` }}>
                                                    <div><span className={getEditorTokenClass('comment')}>{'// Workspace preview with font sizing and resolved theme'}</span></div>
                                                    <div><span className={getEditorTokenClass('keyword')}>const</span>{' '}<span className={getEditorTokenClass('title')}>theme</span>{' '}<span className='opacity-70'>=</span>{' '}<span className={getEditorTokenClass('string')}>'{editorThemeLabel}'</span></div>
                                                    <div><span className={getEditorTokenClass('keyword')}>const</span>{' '}<span className={getEditorTokenClass('title')}>folderStyle</span>{' '}<span className='opacity-70'>=</span>{' '}<span className={getEditorTokenClass('string')}>'{workspacePreferences.folderIconStyle}'</span></div>
                                                    <div><span className={getEditorTokenClass('keyword')}>return</span>{' '}<span className={getEditorTokenClass('accent')}>workspace</span>{' '}<span className='opacity-70'>{'// preview'}</span></div>
                                                    <div><span className={getEditorTokenClass('comment')}>{'// Font size is applied to the actual editor too'}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className='grid gap-6 xl:grid-cols-[0.98fr_1.02fr]'>
                            <Card className='border-border/60'>
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'><FolderGit2 className='h-4 w-4 text-primary' /> Repo tree studio</CardTitle>
                                    <CardDescription>Adjust the file tree density, folder look, and visual accent.</CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-4'>
                                    <div className='space-y-2'>
                                        <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Tree density</div>
                                        <div className='grid gap-2 sm:grid-cols-3'>
                                            {treeDensityOptions.map((option) => {
                                                const active = workspacePreferences.treeDensity === option.value
                                                return (
                                                    <button key={option.value} type='button' onClick={() => updatePreferences({ treeDensity: option.value })} className={`rounded-2xl border px-3 py-3 text-left transition ${active ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/40'}`}>
                                                        <div className='text-sm font-medium'>{option.label}</div>
                                                        <div className='mt-1 text-[11px] text-muted-foreground'>{option.description}</div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className='space-y-2'>
                                        <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Folder icon style</div>
                                        <div className='grid gap-2 sm:grid-cols-2'>
                                            {folderIconOptions.map((option) => {
                                                const active = workspacePreferences.folderIconStyle === option.value
                                                return (
                                                    <button key={option.value} type='button' onClick={() => updatePreferences({ folderIconStyle: option.value })} className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${active ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/40'}`}>
                                                        <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-muted'>{renderFolderIcon(option.value, 'components')}</div>
                                                        <div className='min-w-0'><div className='text-sm font-medium'>{option.label}</div><div className='text-[11px] text-muted-foreground'>{option.description}</div></div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className='space-y-2'>
                                        <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Tree accent</div>
                                        <div className='grid gap-2 sm:grid-cols-3'>
                                            {treeAccentOptions.map((option) => {
                                                const active = workspacePreferences.treeAccent === option.value
                                                return (
                                                    <button key={option.value} type='button' onClick={() => updatePreferences({ treeAccent: option.value })} className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${active ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/40'}`}>
                                                        <span className={`h-5 w-5 rounded-full border ${treeAccentClasses[option.value]}`} />
                                                        <div><div className='text-sm font-medium'>{option.label}</div><div className='text-[11px] text-muted-foreground'>{option.description}</div></div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className='grid gap-3 sm:grid-cols-2'>
                                        <button type='button' onClick={() => updatePreferences({ showTreeGuides: !workspacePreferences.showTreeGuides })} className={`rounded-2xl border px-4 py-3 text-left transition ${workspacePreferences.showTreeGuides ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/40'}`}>
                                            <div className='font-medium'>Tree guides</div>
                                            <div className='mt-1 text-xs text-muted-foreground'>Show branch lines in the tree.</div>
                                        </button>
                                        <button type='button' onClick={() => updatePreferences({ showFileExtensions: !workspacePreferences.showFileExtensions })} className={`rounded-2xl border px-4 py-3 text-left transition ${workspacePreferences.showFileExtensions ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/40'}`}>
                                            <div className='font-medium'>File extensions</div>
                                            <div className='mt-1 text-xs text-muted-foreground'>Keep file endings visible in the repo tree.</div>
                                        </button>
                                    </div>

                                    <div className='space-y-2'>
                                        <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Workspace contrast</div>
                                        <div className='grid gap-2 sm:grid-cols-3'>
                                            {workspaceContrastOptions.map((option) => {
                                                const active = workspacePreferences.contrast === option.value
                                                return (
                                                    <button key={option.value} type='button' onClick={() => updatePreferences({ contrast: option.value })} className={`rounded-2xl border px-3 py-3 text-left transition ${active ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/40'}`}>
                                                        <div className='text-sm font-medium'>{option.label}</div>
                                                        <div className='mt-1 text-[11px] text-muted-foreground'>{option.description}</div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                </CardContent>
                            </Card>

                            <Card className='border-border/60'>
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'><Bot className='h-4 w-4 text-primary' /> Workspace preview</CardTitle>
                                    <CardDescription>A live snapshot of how the tree and editor options will feel.</CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-4'>
                                    <div className={`rounded-3xl border p-4 ${contrastShellClasses[workspacePreferences.contrast]}`}>
                                        <div className='flex items-center justify-between gap-3'><div><div className='text-sm font-medium'>Repository tree</div><div className='text-xs text-muted-foreground'>Density: {workspacePreferences.treeDensity}</div></div><Badge variant='secondary' className='rounded-full capitalize'>{workspacePreferences.treeAccent}</Badge></div>
                                        <div className={`mt-4 space-y-1 rounded-2xl border bg-background p-3 ${treeDensityConfig.text}`}>
                                            {[
                                                { label: 'src', level: 0, folder: true },
                                                { label: 'components', level: 1, folder: true },
                                                { label: 'docs', level: 1, folder: true },
                                                { label: 'public', level: 1, folder: true },
                                                { label: 'api', level: 1, folder: true },
                                                { label: 'tests', level: 1, folder: true },
                                                { label: 'settings.tsx', level: 2, folder: false },
                                                { label: 'page.tsx', level: 2, folder: false },
                                                { label: 'route.ts', level: 2, folder: false },
                                            ].map((item) => (
                                                <div key={`${item.label}-${item.level}`} className={`flex items-center gap-2 rounded-lg px-2 ${treeDensityConfig.row} ${workspacePreferences.showTreeGuides && item.level > 0 ? 'border-l border-border/70' : ''}`} style={{ paddingLeft: `${8 + item.level * treeDensityConfig.indent}px` }}>
                                                    <span className={`flex h-6 w-6 items-center justify-center rounded-md ${item.folder ? treeAccentClass : 'text-muted-foreground bg-muted/40 border border-border/40'}`}>
                                                        {item.folder ? renderFolderIcon(workspacePreferences.folderIconStyle, item.label) : <Code2 className='h-3.5 w-3.5' />}
                                                    </span>
                                                    <span className='truncate'>{item.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className='grid gap-3 sm:grid-cols-2'>
                                        <div className='rounded-2xl border bg-background p-4'><div className='text-xs text-muted-foreground'>Editor theme</div><div className='mt-1 font-medium'>{editorThemeLabel}</div></div>
                                        <div className='rounded-2xl border bg-background p-4'><div className='text-xs text-muted-foreground'>Font size</div><div className='mt-1 font-medium'>{editorFontSize}px</div></div>
                                    </div>
                                    <div className='rounded-2xl border bg-background p-4'><div className='flex items-center gap-2 font-medium'><TerminalSquare className='h-4 w-4 text-primary' /> IDE polish</div><p className='mt-2 text-sm text-muted-foreground'>These presets are designed for fast code navigation, clear folder hierarchy, and readable editor surfaces.</p></div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value='security' className='space-y-6'>
                        <div className='grid gap-6 lg:grid-cols-2'>
                            <Card className='border-border/60'>
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'><Shield className='h-4 w-4 text-primary' /> Security center</CardTitle>
                                    <CardDescription>The frontend is ready; deeper security tooling can be connected later.</CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-3'>
                                    <div className='rounded-2xl border bg-muted/30 p-4'><div className='flex items-center justify-between'><div><div className='font-medium'>Two-factor authentication</div><div className='text-xs text-muted-foreground'>Planned</div></div><Badge variant='secondary' className='rounded-full'>Soon</Badge></div></div>
                                    <div className='rounded-2xl border bg-muted/30 p-4'><div className='flex items-center justify-between'><div><div className='font-medium'>Active sessions</div><div className='text-xs text-muted-foreground'>Planned</div></div><Badge variant='secondary' className='rounded-full'>Soon</Badge></div></div>
                                    <div className='rounded-2xl border bg-muted/30 p-4'><div className='flex items-center justify-between'><div><div className='font-medium'>Password recovery</div><div className='text-xs text-muted-foreground'>Planned</div></div><Badge variant='secondary' className='rounded-full'>Soon</Badge></div></div>
                                </CardContent>
                            </Card>
                            <Card className='border-border/60'>
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'><Bell className='h-4 w-4 text-primary' /> Notification shell</CardTitle>
                                    <CardDescription>Backend sync can be wired to these later.</CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-3'>
                                    {['Email updates', 'Workspace alerts', 'Agent progress'].map((label) => (
                                        <div key={label} className='flex items-center justify-between rounded-2xl border bg-background px-4 py-3'>
                                            <div><div className='font-medium'>{label}</div><div className='text-xs text-muted-foreground'>Ready for backend wiring</div></div>
                                            <div className='h-6 w-11 rounded-full bg-muted p-1'><div className='h-4 w-4 rounded-full bg-background' /></div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}