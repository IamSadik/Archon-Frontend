import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileCode, FileText, Folder, File, ImageIcon, Search, ChevronRight, ChevronDown } from 'lucide-react'
import { useFiles } from '@/hooks/useContext'
import { FileNode } from '@/types'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

const FileTreeItem = ({ node, level = 0 }: { node: FileNode, level?: number }) => {
    const [isOpen, setIsOpen] = useState(false)
    const hasChildren = node.children && node.children.length > 0
    const isFolder = node.file_type === 'directory'

    const getIcon = () => {
        if (isFolder) return isOpen ? <Folder className='h-4 w-4 text-blue-400 fill-blue-400/20' /> : <Folder className='h-4 w-4 text-blue-400' />
        if (node.name.endsWith('.ts') || node.name.endsWith('.tsx') || node.name.endsWith('.js')) return <FileCode className='h-4 w-4 text-yellow-400' />
        if (node.name.endsWith('.md')) return <FileText className='h-4 w-4 text-gray-400' />
        if (node.name.endsWith('.png') || node.name.endsWith('.jpg')) return <ImageIcon className='h-4 w-4 text-green-400' />
        return <File className='h-4 w-4 text-zinc-400' />
    }

    return (
        <div>
            <div
                className='flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded-sm cursor-pointer select-none text-sm group'
                style={{ paddingLeft: `${level * 12}px` }}
                onClick={() => isFolder && setIsOpen(!isOpen)}
            >
                {isFolder && (
                    <span className='text-muted-foreground opacity-50 group-hover:opacity-100'>
                        {isOpen ? <ChevronDown className='h-3 w-3' /> : <ChevronRight className='h-3 w-3' />} 
                    </span>
                )}
                {!isFolder && <span className='w-3' />} {/* Spacer for alignment */}
                {getIcon()}
                <span className='truncate'>{node.name}</span>
            </div>
            {isOpen && hasChildren && (
                <div>
                    {node.children!.map(child => (
                        <FileTreeItem key={child.id} node={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    )
}

export function ProjectContext({ projectId }: { projectId: string }) {
    const { data: files, isLoading } = useFiles(projectId)
    const [search, setSearch] = useState('')

    return (
        <Card className='h-full flex flex-col'>
             <CardHeader className='py-3 border-b'>
                <CardTitle className='text-base'>File Explorer</CardTitle>
                <div className='pt-2'>
                    <div className='relative'>
                        <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                        <Input 
                            placeholder='Search files...' 
                            className='pl-8 h-9' 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className='flex-1 p-0 overflow-hidden'>
                 <div className='h-full overflow-y-auto py-2'>
                    {isLoading ? (
                         <div className='p-4 text-sm text-muted-foreground'>Loading file structure...</div>   
                    ) : files && files.length > 0 ? (
                         <div className='grid gap-1'>
                             {files.map(file => (
                                 <FileTreeItem key={file.id} node={file} />
                             ))}
                         </div>
                    ) : (
                        <div className='p-8 text-center text-sm text-muted-foreground'>
                            No files indexed yet. Upload files or index a directory.
                        </div>
                    )}
                 </div>
            </CardContent>
        </Card>
    )
}
