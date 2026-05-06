'use client'

import { useProjects } from '@/hooks/useProjects'
import { FolderGit2, Activity, Code2, Clock, Plus } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { Badge } from '@/components/ui/badge'
import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const { data: projects, isLoading, error } = useProjects()

  // Calculate statistics
  const stats = useMemo(() => {
    if (!projects || !Array.isArray(projects)) return null

    return {
      total: projects.length,
      active: projects.filter((p) => p.status === 'active').length,
      archived: projects.filter((p) => p.status === 'archived').length,
      repositories: projects.filter((p) => p.repository_path || p.repository_url).length,
      recentlyUpdated: projects.filter((p) => {
        if (!p.updated_at) return false;
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(p.updated_at).getTime()) /
            (1000 * 60 * 60 * 24)
        )
        return daysSinceUpdate <= 7
      }).length,
    }
  }, [projects])

  const recentProjects = useMemo(() => {
    if (!projects || !Array.isArray(projects)) return []
    return [...projects]
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      .slice(0, 4)
  }, [projects])

  if (isLoading) {
    return (
      <div className="space-y-6 pt-6">
        <div className="flex items-center justify-between px-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 px-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
            ))}
        </div>
        <div className="px-6">
             <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Error loading dashboard
          </h2>
          <p className="text-muted-foreground">
            {(error as any)?.message || "Please try refreshing the page."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 pt-6">
      <div className="flex items-center justify-between px-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your projects and activity.
          </p>
        </div>
        <div className="flex items-center space-x-2">
            <CreateProjectDialog 
                trigger={
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Project
                    </Button>
                }
            />
        </div>
      </div>

      <div className="grid gap-4 px-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <FolderGit2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all workspaces
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently in development
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.recentlyUpdated || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Updated in last 7 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repositories</CardTitle>
            <Code2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.repositories || 0}</div>
            <p className="text-xs text-muted-foreground">Git connected</p>
          </CardContent>
        </Card>
      </div>

      <div className="px-6">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>
              Your most recently updated projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="group relative flex flex-col justify-between space-y-3 rounded-lg border p-5 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FolderGit2 className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">{project.name}</h3>
                        </div>
                        {project.status === 'active' ? (
                          <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Archived</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description || 'No description provided.'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {formatDistanceToNow(new Date(project.updated_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                  <FolderGit2 className="h-10 w-10 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">
                    No projects found
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Get started by creating your first project.
                  </p>
                  <div className="mt-4">
                    <CreateProjectDialog
                        trigger={
                            <Button>Create Project</Button>
                        }
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
