'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Editor from '@monaco-editor/react'
import { useTheme } from 'next-themes'
import {
    BookOpen,
    ChevronDown,
    ChevronRight,
    Copy,
    ClipboardPaste,
    Database,
    Eye,
    EyeOff,
    Download,
    Code2,
    FileCode,
    FilePlus,
    Folder,
    FolderCog,
    FolderPlus,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Scissors,
    Shield,
    Sparkles,
    Image as ImageIcon,
    TerminalSquare,
    Trash2,
    Check,
    FolderOpen,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { contextService } from '@/services/context.service'
import { useWorkspacePreferences } from '@/hooks/useWorkspacePreferences'
import type { IDETreeNode } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    contrastShellClasses,
    resolveMonacoThemeName,
    treeAccentClasses,
    treeDensityClasses,
} from '@/lib/workspace-preferences'

interface FileExplorerProps {
    projectId: string
    onActiveFileChange?: (payload: { kind: 'codebase' | 'folder' | 'file'; path?: string; content?: string }) => void
}

interface TreeNode {
    name: string
    path: string
    type: 'file' | 'folder'
    children: TreeNode[]
}

interface ClipboardItem {
    path: string
    type: 'file' | 'folder'
    operation: 'copy' | 'cut'
}

function getLanguageFromPath(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase()
    switch (ext) {
        case 'ts':
            return 'typescript'
        case 'tsx':
            return 'typescript'
        case 'js':
            return 'javascript'
        case 'jsx':
            return 'javascript'
        case 'py':
            return 'python'
        case 'json':
            return 'json'
        case 'md':
            return 'markdown'
        case 'css':
            return 'css'
        case 'html':
            return 'html'
        case 'yml':
            return 'yaml'
        case 'yaml':
            return 'yaml'
        case 'sql':
            return 'sql'
        default:
            return 'plaintext'
    }
}

function getTreeLabel(name: string, keepExtensions: boolean): string {
    if (keepExtensions) return name
    return name.replace(/\.[^.]+$/, '')
}

function renderSmartFolderGlyph(folderName: string) {
    const normalized = folderName.toLowerCase()

    if (/^(src|components|ui|widgets|layouts|views|pages)$/.test(normalized)) return <Code2 className='h-4 w-4' />
    if (/^(app|api|server|route|routes|services|controllers?|endpoints?)$/.test(normalized)) return <FolderOpen className='h-4 w-4' />
    if (/^(config|settings|infra|meta|admin)$/.test(normalized)) return <FolderCog className='h-4 w-4' />
    if (/^(lib|utils|shared|common|core|helpers?)$/.test(normalized)) return <FolderCog className='h-4 w-4' />
    if (/^(docs?|readme|guide|manual|book|knowledge)$/.test(normalized)) return <BookOpen className='h-4 w-4' />
    if (/^(public|static|assets?|images?|img|media|icons?)$/.test(normalized)) return <ImageIcon className='h-4 w-4' />
    if (/^(test|tests|specs?|__tests__|e2e|playwright|cypress)$/.test(normalized)) return <Sparkles className='h-4 w-4' />
    if (/^(db|database|data|schema|migrations?)$/.test(normalized)) return <Database className='h-4 w-4' />
    if (/^(auth|security|private|secret|lock)$/.test(normalized)) return <Shield className='h-4 w-4' />
    if (/^(scripts?|cli|bin|tools?)$/.test(normalized)) return <TerminalSquare className='h-4 w-4' />

    return <FolderOpen className='h-4 w-4' />
}

function renderFolderGlyph(style: 'classic' | 'open' | 'emoji' | 'minimal', folderName: string) {
    switch (style) {
        case 'open':
            return <FolderOpen className='h-4 w-4' />
        case 'emoji':
            return renderSmartFolderGlyph(folderName)
        case 'minimal':
            return <span className='h-3.5 w-3.5 rounded-sm border border-current/60' />
        default:
            return <Folder className='h-4 w-4' />
    }
}

export function FileExplorer({ projectId, onActiveFileChange }: FileExplorerProps) {
    const queryClient = useQueryClient()
    const { resolvedTheme } = useTheme()
    const { preferences: workspacePreferences } = useWorkspacePreferences()
    const [selectedPath, setSelectedPath] = useState<string>('')
    const [editorContent, setEditorContent] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [newFilePath, setNewFilePath] = useState('src/new_file.py')
    const [showHiddenFiles, setShowHiddenFiles] = useState(true)
    const [isDirty, setIsDirty] = useState(false)
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ '': true })
    const [menuPath, setMenuPath] = useState<string | null>(null)
    const [clipboardItem, setClipboardItem] = useState<ClipboardItem | null>(null)
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [selectedFolderPath, setSelectedFolderPath] = useState('')
    const editorTheme = resolveMonacoThemeName(workspacePreferences, resolvedTheme)
    const treeDensity = treeDensityClasses[workspacePreferences.treeDensity]
    const treeAccentClass = treeAccentClasses[workspacePreferences.treeAccent]
    const shellClass = contrastShellClasses[workspacePreferences.contrast]

    const initRepo = useMutation({
        mutationFn: () => contextService.initIDERepo(projectId),
        onSuccess: () => {
            toast.success('IDE workspace initialized')
            queryClient.invalidateQueries({ queryKey: ['ide-tree', projectId] })
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'Failed to initialize IDE workspace')
        },
    })

    const { data: treeData, isLoading: isTreeLoading, refetch: refetchTree } = useQuery({
        queryKey: ['ide-tree', projectId, showHiddenFiles],
        queryFn: () => contextService.getIDETree(projectId, showHiddenFiles),
        enabled: !!projectId,
        retry: false,
    })

    const { data: activeFileData, isFetching: isFileLoading, refetch: refetchActiveFile } = useQuery({
        queryKey: ['ide-file', projectId, selectedPath],
        queryFn: () => contextService.readIDEFile(projectId, selectedPath),
        enabled: !!selectedPath,
        retry: false,
        refetchOnWindowFocus: false,
    })

    const writeFile = useMutation({
        mutationFn: (payload: { filePath: string; content: string }) =>
            contextService.writeIDEFile(projectId, payload.filePath, payload.content, true),
        onSuccess: () => {
            setIsDirty(false)
            toast.success('File saved')
            queryClient.invalidateQueries({ queryKey: ['ide-tree', projectId] })
            onActiveFileChange?.({ kind: 'file', path: selectedPath, content: editorContent })
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'Failed to save file')
        },
    })

    const deletePath = useMutation({
        mutationFn: (path: string) => contextService.deleteIDEPath(projectId, path),
        onSuccess: (_data, path) => {
            if (selectedPath === path || selectedPath.startsWith(`${path}/`)) {
                setSelectedPath('')
                setEditorContent('')
                setIsDirty(false)
                onActiveFileChange?.({ kind: 'codebase' })
            }
            setMenuPath(null)
            toast.success('Deleted')
            queryClient.invalidateQueries({ queryKey: ['ide-tree', projectId] })
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'Failed to delete path')
        },
    })

    const clearWorkspace = useMutation({
        mutationFn: () => contextService.clearIDERepo(projectId),
        onSuccess: (data) => {
            setSelectedPath('')
            setEditorContent('')
            setIsDirty(false)
            setMenuPath(null)
            setClipboardItem(null)
            setExpandedFolders({ '': true })
            setSelectedFolderPath('')
            onActiveFileChange?.({ kind: 'codebase' })
            toast.success(`IDE cleared (${data?.deleted_count || 0} items removed)`)
            queryClient.invalidateQueries({ queryKey: ['ide-tree', projectId] })
            queryClient.invalidateQueries({ queryKey: ['ide-file', projectId, selectedPath] })
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'Failed to clear IDE workspace')
        },
    })

    const renamePath = useMutation({
        mutationFn: (payload: { oldPath: string; newPath: string }) =>
            contextService.renameIDEPath(projectId, payload.oldPath, payload.newPath),
        onSuccess: (data, payload) => {
            if (selectedPath === payload.oldPath || selectedPath.startsWith(`${payload.oldPath}/`)) {
                const nextPath = (data?.new_path || payload.newPath) as string
                setSelectedPath((prev) => prev.replace(payload.oldPath, nextPath))
                onActiveFileChange?.({ kind: 'file', path: data?.new_path || payload.newPath, content: editorContent })
            }
            setMenuPath(null)
            toast.success('Renamed')
            queryClient.invalidateQueries({ queryKey: ['ide-tree', projectId] })
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'Failed to rename path')
        },
    })

    const createFolder = useMutation({
        mutationFn: (path: string) => contextService.createIDEFolder(projectId, path),
        onSuccess: () => {
            setMenuPath(null)
            toast.success('Folder created')
            queryClient.invalidateQueries({ queryKey: ['ide-tree', projectId] })
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'Failed to create folder')
        },
    })

    const copyPath = useMutation({
        mutationFn: (payload: { sourcePath: string; destinationPath: string }) =>
            contextService.copyIDEPath(projectId, payload.sourcePath, payload.destinationPath),
        onSuccess: () => {
            setMenuPath(null)
            toast.success('Copied')
            queryClient.invalidateQueries({ queryKey: ['ide-tree', projectId] })
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'Failed to copy')
        },
    })

    useEffect(() => {
        onActiveFileChange?.({ kind: 'codebase' })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId])

    useEffect(() => {
        if (!selectedPath || !activeFileData) return

        if (!isDirty) {
            setEditorContent(activeFileData.content || '')
            onActiveFileChange?.({ kind: 'file', path: activeFileData.path, content: activeFileData.content || '' })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFileData, selectedPath])

    useEffect(() => {
        if (!selectedPath) return
        refetchActiveFile()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPath])

    // Auto-save with debounce
    useEffect(() => {
        if (!selectedPath || !isDirty) return

        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current)
        }

        // Set new timeout for auto-save
        autoSaveTimeoutRef.current = setTimeout(() => {
            writeFile.mutate({ filePath: selectedPath, content: editorContent })
        }, 1500) // Save after 1.5 seconds of inactivity

        // Cleanup on unmount
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current)
            }
        }
    }, [editorContent, isDirty, selectedPath, writeFile])

    const visibleNodes = useMemo(() => {
        const nodes: IDETreeNode[] = treeData?.nodes || []
        if (!searchTerm.trim()) return nodes
        const needle = searchTerm.trim().toLowerCase()
        return nodes.filter((node) => node.path.toLowerCase().includes(needle))
    }, [treeData?.nodes, searchTerm])

    const treeNodes = useMemo<TreeNode[]>(() => {
        const nodes: IDETreeNode[] = treeData?.nodes || []
        const root: TreeNode = { name: '', path: '', type: 'folder', children: [] }

        const ensureFolder = (parent: TreeNode, folderName: string, folderPath: string): TreeNode => {
            const existing = parent.children.find((c) => c.type === 'folder' && c.path === folderPath)
            if (existing) return existing
            const created: TreeNode = { name: folderName, path: folderPath, type: 'folder', children: [] }
            parent.children.push(created)
            return created
        }

        nodes.forEach((node) => {
            const segments = node.path.split('/').filter(Boolean)
            if (segments.length === 0) return

            let cursor = root
            segments.forEach((segment, idx) => {
                const isLeaf = idx === segments.length - 1
                const builtPath = segments.slice(0, idx + 1).join('/')
                if (isLeaf && node.type === 'file') {
                    const existing = cursor.children.find((c) => c.path === builtPath && c.type === 'file')
                    if (!existing) {
                        cursor.children.push({ name: segment, path: builtPath, type: 'file', children: [] })
                    }
                } else {
                    cursor = ensureFolder(cursor, segment, builtPath)
                }
            })
        })

        const sortTree = (items: TreeNode[]) => {
            items.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
                return a.name.localeCompare(b.name)
            })
            items.forEach((item) => sortTree(item.children))
        }
        sortTree(root.children)
        return root.children
    }, [treeData?.nodes])

    const handleCreateFile = () => {
        if (!newFilePath.trim()) {
            toast.error('Provide a file path')
            return
        }

        writeFile.mutate(
            { filePath: newFilePath.trim(), content: '' },
            {
                onSuccess: () => {
                    setSelectedPath(newFilePath.trim())
                    setEditorContent('')
                    onActiveFileChange?.({ kind: 'file', path: newFilePath.trim(), content: '' })
                    queryClient.invalidateQueries({ queryKey: ['ide-file', projectId, newFilePath.trim()] })
                    toast.success('File created')
                },
            }
        )
    }

    const folderOptions = useMemo(() => {
        const folders = (treeData?.nodes || [])
            .filter((node) => node.type === 'folder')
            .map((node) => node.path)
            .filter(Boolean)
        return [''].concat(Array.from(new Set(folders)))
    }, [treeData?.nodes])

    const toggleFolder = (path: string) => {
        setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }))
    }

    const requestRename = (node: TreeNode) => {
        const currentName = node.name
        const nextName = window.prompt('Rename to:', currentName)
        if (!nextName || nextName.trim() === currentName) return

        const parentPath = node.path.includes('/') ? node.path.split('/').slice(0, -1).join('/') : ''
        const newPath = parentPath ? `${parentPath}/${nextName.trim()}` : nextName.trim()
        renamePath.mutate({ oldPath: node.path, newPath })
    }

    const requestCreateFileInFolder = (folderPath: string) => {
        const fileName = window.prompt('New file name (for example: main.py)')
        if (!fileName || !fileName.trim()) return
        const targetPath = folderPath ? `${folderPath}/${fileName.trim()}` : fileName.trim()
        writeFile.mutate(
            { filePath: targetPath, content: '' },
            {
                onSuccess: () => {
                    setSelectedPath(targetPath)
                    setEditorContent('')
                    onActiveFileChange?.({ kind: 'file', path: targetPath, content: '' })
                    queryClient.invalidateQueries({ queryKey: ['ide-file', projectId, targetPath] })
                    setMenuPath(null)
                    toast.success('File created')
                },
            }
        )
    }

    const requestCreateFolder = (folderPath: string) => {
        const folderName = window.prompt('New folder name')
        if (!folderName || !folderName.trim()) return
        const targetPath = folderPath ? `${folderPath}/${folderName.trim()}` : folderName.trim()
        createFolder.mutate(targetPath)
    }

    const requestCopy = (node: TreeNode) => {
        setClipboardItem({ path: node.path, type: node.type, operation: 'copy' })
        setMenuPath(null)
        toast.success('Copied to clipboard')
    }

    const requestCut = (node: TreeNode) => {
        setClipboardItem({ path: node.path, type: node.type, operation: 'cut' })
        setMenuPath(null)
        toast.success('Cut to clipboard')
    }

    const requestPasteInto = (targetFolderPath: string) => {
        if (!clipboardItem) return
        const baseName = clipboardItem.path.split('/').pop() || clipboardItem.path
        const destinationPath = targetFolderPath ? `${targetFolderPath}/${baseName}` : baseName

        if (destinationPath === clipboardItem.path) {
            toast.error('Destination is same as source')
            return
        }

        if (clipboardItem.operation === 'copy') {
            copyPath.mutate({ sourcePath: clipboardItem.path, destinationPath })
            return
        }

        renamePath.mutate(
            { oldPath: clipboardItem.path, newPath: destinationPath },
            {
                onSuccess: () => {
                    setClipboardItem(null)
                },
            }
        )
    }

    const requestDelete = (node: TreeNode) => {
        const confirmMessage = node.type === 'folder'
            ? `Delete folder "${node.name}" and all contents?`
            : `Delete file "${node.name}"?`
        if (!window.confirm(confirmMessage)) return
        deletePath.mutate(node.path)
    }

    const requestDeleteSelectedFile = () => {
        if (!selectedPath) return
        const selectedNode = treeNodes.find((node) => node.path === selectedPath)
        const confirmMessage = selectedNode?.type === 'folder'
            ? `Delete folder "${selectedNode.name}" and all contents?`
            : `Delete file "${selectedNode?.name || selectedPath}"?`
        if (!window.confirm(confirmMessage)) return
        deletePath.mutate(selectedPath)
    }

    const renderTree = (nodes: TreeNode[], depth = 0) => {
        return nodes.map((node) => {
            const isFolder = node.type === 'folder'
            const isExpanded = expandedFolders[node.path] ?? (depth < 2)
            const isSelected = selectedPath === node.path
            const treeLabel = getTreeLabel(node.name, workspacePreferences.showFileExtensions)
            const rowPadding = 8 + depth * treeDensity.indent

            return (
                <li key={node.path}>
                    <div
                        className={`group relative flex items-center gap-2 rounded px-2 ${treeDensity.row} ${treeDensity.text} ${isSelected ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/20' : 'hover:bg-muted/60'}`}
                        style={{ paddingLeft: `${rowPadding}px` }}
                    >
                        {isFolder ? (
                            <button type='button' className='rounded p-0.5 hover:bg-muted-foreground/10' onClick={() => toggleFolder(node.path)}>
                                {isExpanded ? <ChevronDown className='h-3.5 w-3.5' /> : <ChevronRight className='h-3.5 w-3.5' />}
                            </button>
                        ) : (
                            <span />
                        )}

                        <button
                            type='button'
                            onClick={() => {
                                if (isDirty && selectedPath && selectedPath !== node.path) {
                                    const proceed = window.confirm('You have unsaved changes. Continue and discard edits?')
                                    if (!proceed) return
                                }
                                if (!isFolder) {
                                    setSelectedPath(node.path)
                                } else {
                                    onActiveFileChange?.({ kind: 'folder', path: node.path })
                                    setSelectedFolderPath(node.path)
                                    toggleFolder(node.path)
                                }
                            }}
                            className='flex min-w-0 flex-1 items-center gap-2 text-left'
                        >
                            {isFolder ? (
                                <span className={`flex h-6 w-6 items-center justify-center rounded-md ${treeAccentClass}`}>
                                    {renderFolderGlyph(workspacePreferences.folderIconStyle, node.name)}
                                </span>
                            ) : (
                                <FileCode className='h-4 w-4 text-muted-foreground' />
                            )}
                            <span className='truncate'>{treeLabel}</span>
                        </button>

                        <button
                            type='button'
                            className='opacity-0 transition-opacity group-hover:opacity-100'
                            onClick={(e) => {
                                e.stopPropagation()
                                setMenuPath((prev) => (prev === node.path ? null : node.path))
                            }}
                        >
                            <MoreHorizontal className='h-4 w-4 text-muted-foreground' />
                        </button>

                        {menuPath === node.path && (
                            <div className='absolute right-2 top-7 z-20 w-40 rounded-md border bg-background p-1 shadow'>
                                {isFolder && (
                                    <>
                                        <button
                                            type='button'
                                            className='flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted'
                                            onClick={() => requestCreateFileInFolder(node.path)}
                                        >
                                            <FilePlus className='h-3.5 w-3.5' /> New File
                                        </button>
                                        <button
                                            type='button'
                                            className='flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted'
                                            onClick={() => requestCreateFolder(node.path)}
                                        >
                                            <FolderPlus className='h-3.5 w-3.5' /> New Folder
                                        </button>
                                    </>
                                )}
                                <button
                                    type='button'
                                    className='flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted'
                                    onClick={() => requestRename(node)}
                                >
                                    <Pencil className='h-3.5 w-3.5' /> Rename
                                </button>
                                <button
                                    type='button'
                                    className='flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted'
                                    onClick={() => requestCopy(node)}
                                >
                                    <Copy className='h-3.5 w-3.5' /> Copy
                                </button>
                                <button
                                    type='button'
                                    className='flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted'
                                    onClick={() => requestCut(node)}
                                >
                                    <Scissors className='h-3.5 w-3.5' /> Cut
                                </button>
                                {isFolder && clipboardItem && (
                                    <button
                                        type='button'
                                        className='flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted'
                                        onClick={() => requestPasteInto(node.path)}
                                    >
                                        <FolderPlus className='h-3.5 w-3.5' /> Paste
                                    </button>
                                )}
                                <button
                                    type='button'
                                    className='flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs text-destructive hover:bg-muted'
                                    onClick={() => requestDelete(node)}
                                >
                                    <Trash2 className='h-3.5 w-3.5' /> Delete
                                </button>
                            </div>
                        )}
                    </div>

                    {isFolder && isExpanded && node.children.length > 0 && (
                        <ul className={workspacePreferences.showTreeGuides && depth >= 0 ? 'ml-2 border-l border-border/70 pl-1' : ''}>
                            {renderTree(node.children, depth + 1)}
                        </ul>
                    )}
                </li>
            )
        })
    }

    const handleDownload = () => {
        const url = contextService.getIDERepoDownloadUrl(projectId)
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const handleClearWorkspace = () => {
        const confirmClear = window.confirm(
            'Delete every file and folder in this IDE workspace? This will keep the workspace shell but remove all contents.'
        )
        if (!confirmClear) return
        clearWorkspace.mutate()
    }

    return (
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]'>
            <Card className={`flex h-[700px] min-h-0 flex-col overflow-hidden ${shellClass}`}>
                <CardHeader className='space-y-3 border-b pb-3'>
                    <div className='flex items-center justify-between'>
                        <CardTitle className='text-base'>IDE Workspace</CardTitle>
                        <div className='flex items-center gap-1'>
                            <Button size='icon' variant='ghost' onClick={() => refetchTree()} title='Refresh tree'>
                                <RefreshCw className='h-4 w-4' />
                            </Button>
                            <Button size='icon' variant='ghost' onClick={handleDownload} title='Download codebase zip'>
                                <Download className='h-4 w-4' />
                            </Button>
                            <Button
                                size='sm'
                                variant='ghost'
                                className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                onClick={handleClearWorkspace}
                                disabled={clearWorkspace.isPending}
                                title='Clear IDE workspace'
                            >
                                {clearWorkspace.isPending ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Trash2 className='mr-2 h-4 w-4' />}

                            </Button>
                        </div>
                    </div>

                    <div className='flex gap-2'>
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder='Search files...'
                            className='h-8'
                        />
                        <Button size='icon' variant='outline' disabled>
                            <Search className='h-4 w-4' />
                        </Button>
                    </div>

                    <div className='flex items-center gap-2'>
                        <div className='min-w-0 flex-1'>
                            <label className='mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                                Folder focus
                            </label>
                            <select
                                value={selectedFolderPath}
                                onChange={(e) => {
                                    const nextPath = e.target.value
                                    setSelectedFolderPath(nextPath)
                                    if (nextPath) {
                                        onActiveFileChange?.({ kind: 'folder', path: nextPath })
                                    } else {
                                        onActiveFileChange?.({ kind: 'codebase' })
                                    }
                                }}
                                className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'
                            >
                                <option value=''>Entire codebase</option>
                                {folderOptions.filter(Boolean).map((folderPath) => (
                                    <option key={folderPath} value={folderPath}>
                                        {folderPath}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className='flex items-center justify-between gap-2'>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-8 gap-2 text-xs'
                            onClick={() => setShowHiddenFiles((prev) => !prev)}
                            title={showHiddenFiles ? 'Hide hidden files' : 'Show hidden files'}
                        >
                            {showHiddenFiles ? <EyeOff className='h-3.5 w-3.5' /> : <Eye className='h-3.5 w-3.5' />}
                            {showHiddenFiles ? 'Hidden files on' : 'Hidden files off'}
                        </Button>
                        <div className='text-[11px] text-muted-foreground'>
                            Hidden files include dotfiles like .env
                        </div>
                    </div>

                    <div className='flex gap-2'>
                        <Input
                            value={newFilePath}
                            onChange={(e) => setNewFilePath(e.target.value)}
                            placeholder='src/new_file.py'
                            className='h-8'
                        />
                        <Button size='icon' variant='outline' onClick={handleCreateFile}>
                            <Plus className='h-4 w-4' />
                        </Button>
                        <Button
                            size='icon'
                            variant='outline'
                            onClick={() => requestCreateFolder('')}
                            title='Create folder in project root'
                        >
                            <FolderPlus className='h-4 w-4' />
                        </Button>
                        <Button
                            size='icon'
                            variant='outline'
                            onClick={() => requestPasteInto('')}
                            disabled={!clipboardItem}
                            title='Paste into project root'
                        >
                            <ClipboardPaste className='h-4 w-4' />
                        </Button>
                    </div>

                    <Button variant='secondary' onClick={() => initRepo.mutate()} disabled={initRepo.isPending}>
                        {initRepo.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                        Initialize IDE Repository
                    </Button>
                </CardHeader>

                <CardContent className='min-h-0 flex-1 overflow-y-auto p-0'>
                    {isTreeLoading ? (
                        <div className='flex h-full items-center justify-center'>
                            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                        </div>
                    ) : visibleNodes.length === 0 ? (
                        <div className='p-4 text-sm text-muted-foreground'>
                            No files yet. Initialize repository and create first file.
                        </div>
                    ) : (
                        searchTerm.trim() ? (
                            <ul className='space-y-1 p-2'>
                                {visibleNodes.map((node) => (
                                    <li key={node.path} className='text-sm text-muted-foreground'>
                                        {node.path}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <ul className='space-y-1 p-2'>{renderTree(treeNodes)}</ul>
                        )
                    )}
                </CardContent>
            </Card>

            <Card className={`flex h-[700px] min-h-0 flex-col overflow-hidden ${shellClass}`}>
                <CardHeader className='border-b pb-3'>
                    <div className='flex items-center justify-between'>
                        <div>
                            <CardTitle className='text-base'>Code Editor</CardTitle>
                            <p className='mt-1 text-xs text-muted-foreground'>
                                {selectedPath || 'Select a file from IDE workspace'}
                            </p>
                        </div>
                        <div className='flex items-center gap-2 text-xs'>
                            {selectedPath ? (
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    className='h-8 gap-2 text-xs text-destructive hover:text-destructive'
                                    onClick={requestDeleteSelectedFile}
                                >
                                    <Trash2 className='h-3.5 w-3.5' /> Delete file
                                </Button>
                            ) : null}
                            {isFileLoading ? (
                                <div className='flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground'>
                                    <Loader2 className='h-3 w-3 animate-spin' /> Refreshing
                                </div>
                            ) : isDirty ? (
                                <div className='flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-1 text-yellow-700'>
                                    {writeFile.isPending ? (
                                        <>
                                            <Loader2 className='h-3 w-3 animate-spin' /> Saving...
                                        </>
                                    ) : (
                                        <>
                                            <div className='h-1.5 w-1.5 rounded-full bg-yellow-600' /> Unsaved
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className='flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-green-700'>
                                    <Check className='h-3 w-3' /> Saved
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className='min-h-0 flex-1 p-0'>
                    {selectedPath ? (
                        <Editor
                            height='100%'
                            beforeMount={(monaco) => {
                                const defineArchonTheme = (
                                    name: string,
                                    base: 'vs' | 'vs-dark' | 'hc-black',
                                    colors: Record<string, string>,
                                    rules: Array<{ token: string; foreground?: string; fontStyle?: string }> = [],
                                ) => {
                                    monaco.editor.defineTheme(name, {
                                        base,
                                        inherit: true,
                                        rules,
                                        colors,
                                    })
                                }

                                defineArchonTheme('archon-light', 'vs', {
                                    'editor.background': '#ffffff',
                                    'editorGutter.background': '#ffffff',
                                    'editor.foreground': '#0f172a',
                                    'editor.lineHighlightBackground': '#e2e8f033',
                                    'editor.selectionBackground': '#bfdbfe80',
                                    'editorCursor.foreground': '#0f172a',
                                    'editor.findMatchBackground': '#fde68a88',
                                }, [
                                    { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
                                    { token: 'keyword', foreground: '2563eb', fontStyle: 'bold' },
                                    { token: 'string', foreground: '059669' },
                                    { token: 'number', foreground: 'd97706' },
                                    { token: 'type', foreground: '0f766e' },
                                    { token: 'class', foreground: '7c3aed' },
                                    { token: 'function', foreground: '0284c7' },
                                    { token: 'variable', foreground: '0f172a' },
                                    { token: 'constant', foreground: 'dc2626' },
                                ])
                                defineArchonTheme('archon-dark', 'vs-dark', {
                                    'editor.background': '#020817',
                                    'editorGutter.background': '#020817',
                                    'editor.foreground': '#e2e8f0',
                                    'editor.lineHighlightBackground': '#1e293b66',
                                    'editor.selectionBackground': '#38bdf833',
                                    'editorCursor.foreground': '#f8fafc',
                                    'editor.findMatchBackground': '#22c55e55',
                                }, [
                                    { token: 'comment', foreground: '94a3b8', fontStyle: 'italic' },
                                    { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
                                    { token: 'string', foreground: '34d399' },
                                    { token: 'number', foreground: 'fbbf24' },
                                    { token: 'type', foreground: '60a5fa' },
                                    { token: 'class', foreground: 'a78bfa' },
                                    { token: 'function', foreground: '22d3ee' },
                                    { token: 'variable', foreground: 'e2e8f0' },
                                    { token: 'constant', foreground: 'fda4af' },
                                ])
                                defineArchonTheme('archon-midnight', 'vs-dark', {
                                    'editor.background': '#070b1a',
                                    'editorGutter.background': '#070b1a',
                                    'editor.foreground': '#e0f2fe',
                                    'editor.lineHighlightBackground': '#11182788',
                                    'editor.selectionBackground': '#06b6d433',
                                    'editorCursor.foreground': '#c4b5fd',
                                }, [
                                    { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
                                    { token: 'keyword', foreground: '22d3ee', fontStyle: 'bold' },
                                    { token: 'string', foreground: 'bef264' },
                                    { token: 'number', foreground: 'f59e0b' },
                                    { token: 'type', foreground: '93c5fd' },
                                    { token: 'class', foreground: 'c084fc' },
                                    { token: 'function', foreground: '34d399' },
                                    { token: 'variable', foreground: 'e0f2fe' },
                                    { token: 'constant', foreground: 'fdba74' },
                                ])
                                defineArchonTheme('archon-dracula', 'vs-dark', {
                                    'editor.background': '#1e1f29',
                                    'editorGutter.background': '#1e1f29',
                                    'editor.foreground': '#f8fafc',
                                    'editor.lineHighlightBackground': '#2d2d3f88',
                                    'editor.selectionBackground': '#c084fc33',
                                    'editorCursor.foreground': '#f9a8d4',
                                }, [
                                    { token: 'comment', foreground: '94a3b8', fontStyle: 'italic' },
                                    { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
                                    { token: 'string', foreground: '86efac' },
                                    { token: 'number', foreground: 'fbbf24' },
                                    { token: 'type', foreground: '7dd3fc' },
                                    { token: 'class', foreground: 'f9a8d4' },
                                    { token: 'function', foreground: '2dd4bf' },
                                    { token: 'variable', foreground: 'f8fafc' },
                                    { token: 'constant', foreground: 'fde68a' },
                                ])
                                defineArchonTheme('archon-solarized', 'vs', {
                                    'editor.background': '#fdf6e3',
                                    'editorGutter.background': '#fdf6e3',
                                    'editor.foreground': '#073642',
                                    'editor.lineHighlightBackground': '#eee8d588',
                                    'editor.selectionBackground': '#93a1a133',
                                    'editorCursor.foreground': '#586e75',
                                }, [
                                    { token: 'comment', foreground: '93a1a1', fontStyle: 'italic' },
                                    { token: 'keyword', foreground: '268bd2', fontStyle: 'bold' },
                                    { token: 'string', foreground: '2aa198' },
                                    { token: 'number', foreground: 'b58900' },
                                    { token: 'type', foreground: 'cb4b16' },
                                    { token: 'class', foreground: '6c71c4' },
                                    { token: 'function', foreground: '859900' },
                                    { token: 'variable', foreground: '073642' },
                                    { token: 'constant', foreground: 'dc322f' },
                                ])
                                defineArchonTheme('archon-high-contrast', 'hc-black', {
                                    'editor.background': '#000000',
                                    'editorGutter.background': '#000000',
                                    'editor.foreground': '#ffffff',
                                    'editor.lineHighlightBackground': '#ffffff22',
                                    'editor.selectionBackground': '#ffffff40',
                                    'editorCursor.foreground': '#ffffff',
                                }, [
                                    { token: 'comment', foreground: 'd4d4d4', fontStyle: 'italic' },
                                    { token: 'keyword', foreground: 'ffff00', fontStyle: 'bold' },
                                    { token: 'string', foreground: '00ff9c' },
                                    { token: 'number', foreground: '00e5ff' },
                                    { token: 'type', foreground: '8ab4ff' },
                                    { token: 'class', foreground: 'ffb86c' },
                                    { token: 'function', foreground: '7cfcff' },
                                    { token: 'variable', foreground: 'ffffff' },
                                    { token: 'constant', foreground: 'ff6b6b' },
                                ])
                                defineArchonTheme('archon-nord', 'vs-dark', {
                                    'editor.background': '#2e3440',
                                    'editorGutter.background': '#2e3440',
                                    'editor.foreground': '#eceff4',
                                    'editor.lineHighlightBackground': '#434c5e66',
                                    'editor.selectionBackground': '#81a1c133',
                                    'editorCursor.foreground': '#eceff4',
                                }, [
                                    { token: 'comment', foreground: '616e88', fontStyle: 'italic' },
                                    { token: 'keyword', foreground: '81a1c1', fontStyle: 'bold' },
                                    { token: 'string', foreground: 'a3be8c' },
                                    { token: 'number', foreground: 'ebcb8b' },
                                    { token: 'type', foreground: '8fbcbb' },
                                    { token: 'class', foreground: 'b48ead' },
                                    { token: 'function', foreground: '88c0d0' },
                                    { token: 'variable', foreground: 'eceff4' },
                                    { token: 'constant', foreground: 'd08770' },
                                ])
                                defineArchonTheme('archon-gruvbox', 'vs-dark', {
                                    'editor.background': '#282828',
                                    'editorGutter.background': '#282828',
                                    'editor.foreground': '#ebdbb2',
                                    'editor.lineHighlightBackground': '#3c383666',
                                    'editor.selectionBackground': '#665c5433',
                                    'editorCursor.foreground': '#fbf1c7',
                                }, [
                                    { token: 'comment', foreground: '928374', fontStyle: 'italic' },
                                    { token: 'keyword', foreground: 'fb4934', fontStyle: 'bold' },
                                    { token: 'string', foreground: 'b8bb26' },
                                    { token: 'number', foreground: 'd3869b' },
                                    { token: 'type', foreground: '83a598' },
                                    { token: 'class', foreground: 'fabd2f' },
                                    { token: 'function', foreground: '8ec07c' },
                                    { token: 'variable', foreground: 'ebdbb2' },
                                    { token: 'constant', foreground: 'fe8019' },
                                ])
                                defineArchonTheme('archon-tokyo-night', 'vs-dark', {
                                    'editor.background': '#1a1b26',
                                    'editorGutter.background': '#1a1b26',
                                    'editor.foreground': '#c0caf5',
                                    'editor.lineHighlightBackground': '#24283b66',
                                    'editor.selectionBackground': '#7aa2f733',
                                    'editorCursor.foreground': '#c0caf5',
                                }, [
                                    { token: 'comment', foreground: '565f89', fontStyle: 'italic' },
                                    { token: 'keyword', foreground: '7aa2f7', fontStyle: 'bold' },
                                    { token: 'string', foreground: '9ece6a' },
                                    { token: 'number', foreground: 'ff9e64' },
                                    { token: 'type', foreground: '2ac3de' },
                                    { token: 'class', foreground: 'bb9af7' },
                                    { token: 'function', foreground: 'f7768e' },
                                    { token: 'variable', foreground: 'c0caf5' },
                                    { token: 'constant', foreground: 'e0af68' },
                                ])
                                defineArchonTheme('archon-catppuccin', 'vs-dark', {
                                    'editor.background': '#1e1e2e',
                                    'editorGutter.background': '#1e1e2e',
                                    'editor.foreground': '#cdd6f4',
                                    'editor.lineHighlightBackground': '#31324466',
                                    'editor.selectionBackground': '#cba6f733',
                                    'editorCursor.foreground': '#f5e0dc',
                                }, [
                                    { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
                                    { token: 'keyword', foreground: 'cba6f7', fontStyle: 'bold' },
                                    { token: 'string', foreground: 'a6e3a1' },
                                    { token: 'number', foreground: 'fab387' },
                                    { token: 'type', foreground: '89b4fa' },
                                    { token: 'class', foreground: 'f38ba8' },
                                    { token: 'function', foreground: '74c7ec' },
                                    { token: 'variable', foreground: 'cdd6f4' },
                                    { token: 'constant', foreground: 'f9e2af' },
                                ])
                            }}
                            theme={editorTheme}
                            language={getLanguageFromPath(selectedPath)}
                            value={editorContent}
                            onChange={(value) => {
                                setEditorContent(value || '')
                                setIsDirty(true)
                            }}
                            options={{
                                minimap: { enabled: true },
                                fontSize: workspacePreferences.editorFontSize,
                                lineNumbers: workspacePreferences.showLineNumbers ? 'on' : 'off',
                                wordWrap: workspacePreferences.wordWrap,
                                automaticLayout: true,
                            }}
                        />
                    ) : (
                        <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
                            Select a file to start editing
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
