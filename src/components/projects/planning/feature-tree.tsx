'use client'

import { useState } from 'react'
import { Feature } from '@/types'
import { ChevronRight, ChevronDown, Circle, CheckCircle2, PlayCircle, AlertCircle, GitBranch, Package, ListTodo, Dot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface FeatureTreeItemProps {
  feature: Feature
  level?: number
  onSelect?: (feature: Feature) => void
  nodeNumber?: string
}

export function FeatureTreeItem({ feature, level = 0, onSelect, nodeNumber }: FeatureTreeItemProps) {
  const [isOpen, setIsOpen] = useState(true)

  const hasChildren = feature.children && feature.children.length > 0
  const hasTasks = (feature.tasks?.length || 0) > 0
  const metadata = feature.metadata || {}
  const dependencyCount = feature.dependencies?.length || metadata.depends_on_keys?.length || 0
  const taskCount = feature.tasks?.length || 0
  const isPhase = level === 0 || metadata.tree_role === 'phase'
  const executionStage = metadata.execution_stage || (isPhase ? 'phase' : 'work item')
  const summaryText = [
    nodeNumber ? `Node ${nodeNumber}` : null,
    feature.name,
    feature.description,
    `Status: ${feature.status}`,
    `Priority: P${feature.priority}`,
    feature.estimated_effort ? `Effort: ${feature.estimated_effort}` : null,
    dependencyCount ? `Dependencies: ${dependencyCount}` : null,
    taskCount ? `Tasks: ${taskCount}` : null,
  ].filter(Boolean).join(' | ')

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'in_progress': return <PlayCircle className="h-4 w-4 text-blue-500" />
      case 'blocked': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'paused': return <Circle className="h-4 w-4 text-yellow-500" />
      case 'not_started': return <Circle className="h-4 w-4 text-gray-400" />
      default: return <Circle className="h-4 w-4 text-gray-300" />
    }
  }

  return (
    <div className="select-none">
      <div
        className={cn(
          "group flex items-start gap-2 rounded-md px-2 py-2 transition-colors hover:bg-accent/50",
          level > 0 && "border-l border-border/60 pl-4"
        )}
        onClick={() => onSelect?.(feature)}
        title={summaryText}
      >
        <div
          className={cn("mt-0.5 rounded-sm p-1 hover:bg-accent", !hasChildren && "opacity-0")}
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>

        <div className="mt-0.5">{getStatusIcon(feature.status)}</div>

        {nodeNumber && (
          <div className="mt-0.5 min-w-10 rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 text-center text-[11px] font-semibold text-foreground">
            {nodeNumber}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium truncate">{feature.name}</span>
            <Badge variant={isPhase ? 'default' : 'outline'} className="text-[10px] h-5 capitalize">
              {executionStage}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5">
              P{feature.priority}
            </Badge>
            {dependencyCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                <GitBranch className="h-3 w-3" />
                {dependencyCount}
              </Badge>
            )}
            {taskCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                <ListTodo className="h-3 w-3" />
                {taskCount}
              </Badge>
            )}
            {hasChildren && (
              <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                <Package className="h-3 w-3" />
                {feature.children!.length}
              </Badge>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {feature.description}
          </div>
          {metadata.tree_path && (
            <div className="mt-1 text-[11px] text-muted-foreground/80 truncate">
              {metadata.tree_path}
            </div>
          )}
        </div>

        {feature.estimated_effort && (
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {feature.estimated_effort}
          </div>
        )}
      </div>

      {isOpen && (hasChildren || hasTasks) && (
        <div className="ml-6 border-l border-border/60 pl-3 my-1 space-y-1">
          {(feature.children || []).map((child, index) => (
            <FeatureTreeItem
              key={child.id}
              feature={child}
              level={level + 1}
              nodeNumber={nodeNumber ? `${nodeNumber}.${index + 1}` : `${index + 1}`}
              onSelect={onSelect}
            />
          ))}

          {feature.tasks?.map((task, index) => (
            <div
              key={task.id}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
              title={`Task ${nodeNumber ? `${nodeNumber}.${index + 1}` : index + 1} | ${task.title} | ${task.description || ''}`}
            >
              <div className="mt-0.5 text-muted-foreground/70">
                <Dot className="h-4 w-4" />
              </div>
              <div className="min-w-8 rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 text-center text-[10px] font-semibold text-foreground">
                {nodeNumber ? `${nodeNumber}.${index + 1}` : `${index + 1}`}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-foreground">{task.title}</span>
                  <Badge variant="outline" className="h-5 text-[10px]">
                    task
                  </Badge>
                </div>
                {task.description && (
                  <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {task.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
