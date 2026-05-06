'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageFormatterProps {
    content: string
}

interface CodeBlock {
    language: string
    code: string
}

interface JsonResponsePayload {
    summary?: string
    goal?: string
    type?: string
    status?: string
    message?: string
    success?: boolean
    session_id?: string
    file_changes?: Array<{
        path?: string
        content?: string
    }>
    generated_files?: Record<string, string>
    files?: Record<string, string>
    files_created?: Array<string | { path?: string; content?: string }>
    files_modified?: Array<string | { path?: string; content?: string }>
    created_files?: Array<string | { path?: string; content?: string }>
    modified_files?: Array<string | { path?: string; content?: string }>
    deleted_files?: Array<string | { path?: string; content?: string }>
    completed_actions?: number
    failed_actions?: number
    result?: any
    output?: any
    error?: string
}

function isPlainObject(value: any): value is Record<string, any> {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

function prettyValue(value: any): string {
    if (value == null) return 'None'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    if (Array.isArray(value)) {
        if (value.length === 0) return 'None'
        return value.map((item) => prettyValue(item)).join(', ')
    }
    if (isPlainObject(value)) {
        return JSON.stringify(value, null, 2)
    }
    return String(value)
}

function humanizeKey(key: string): string {
    return key
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, (m) => m.toUpperCase())
}

function appendValueLines(lines: string[], label: string, value: any, depth = 0) {
    if (value === undefined || value === null || value === '') return

    const indent = '  '.repeat(depth)

    if (Array.isArray(value)) {
        if (value.length === 0) {
            lines.push(`${indent}- ${label}: None`)
            return
        }
        lines.push(`${indent}- ${label}:`)
        value.forEach((item) => {
            if (isPlainObject(item)) {
                Object.entries(item).forEach(([k, v]) => appendValueLines(lines, humanizeKey(k), v, depth + 1))
            } else {
                lines.push(`${indent}  - ${prettyValue(item)}`)
            }
        })
        return
    }

    if (isPlainObject(value)) {
        lines.push(`${indent}- ${label}:`)
        Object.entries(value).forEach(([k, v]) => {
            if (isPlainObject(v) || Array.isArray(v)) {
                appendValueLines(lines, humanizeKey(k), v, depth + 1)
            } else {
                lines.push(`${indent}  - ${humanizeKey(k)}: ${prettyValue(v)}`)
            }
        })
        return
    }

    lines.push(`${indent}- ${label}: ${prettyValue(value)}`)
}

function flattenResultObject(value: any, prefix: string, lines: string[]) {
    if (!isPlainObject(value) && !Array.isArray(value)) return

    if (Array.isArray(value)) {
        appendValueLines(lines, prefix, value)
        return
    }

    const preferredNestedOrder = ['summary', 'message', 'status', 'success', 'created_files', 'files_created', 'modified_files', 'files_modified', 'deleted_files', 'output', 'result', 'error']

    preferredNestedOrder.forEach((key) => {
        if (key in value) {
            const nested = value[key]
            if (nested === undefined || nested === null || nested === '') return
            const label = key === 'result' ? `${prefix} Result` : key === 'output' ? `${prefix} Output` : humanizeKey(key)
            if (isPlainObject(nested) || Array.isArray(nested)) {
                appendValueLines(lines, label, nested)
            } else {
                lines.push(`- ${label}: ${prettyValue(nested)}`)
            }
        }
    })

    Object.entries(value).forEach(([key, nested]) => {
        if (preferredNestedOrder.includes(key)) return
        if (nested === undefined || nested === null || nested === '') return
        const label = humanizeKey(key)
        if (isPlainObject(nested) || Array.isArray(nested)) {
            appendValueLines(lines, label, nested)
        } else {
            lines.push(`- ${label}: ${prettyValue(nested)}`)
        }
    })
}

function buildGenericJsonSummary(payload: JsonResponsePayload): string {
    const lines: string[] = []
    const title = payload.message || payload.summary || payload.goal || payload.type || 'Agent response'
    lines.push(title.trim())

    const preferredOrder = [
        'status', 'success', 'completed_actions', 'failed_actions', 'session_id', 'goal', 'type', 'message', 'error'
    ] as const

    preferredOrder.forEach((key) => {
        const value = payload[key]
        if (value === undefined || value === null || value === '') return
        if (key === 'message' && (value === payload.summary || value === payload.goal)) return
        if (key === 'goal' && value === payload.message) return
        lines.push(`- ${humanizeKey(key)}: ${prettyValue(value)}`)
    })

    const extraKeys = Object.keys(payload).filter((key) => !preferredOrder.includes(key as any) && !['summary', 'file_changes', 'generated_files', 'files', 'result', 'output'].includes(key))
    extraKeys.forEach((key) => {
        const value = (payload as any)[key]
        if (value === undefined || value === null || value === '') return
        lines.push(`- ${humanizeKey(key)}: ${prettyValue(value)}`)
    })

    if (payload.result !== undefined) {
        flattenResultObject(payload.result, 'Result', lines)
    }
    if (payload.output !== undefined) {
        flattenResultObject(payload.output, 'Output', lines)
    }

    return lines.join('\n')
}

function collectUniquePaths(payload: JsonResponsePayload): string[] {
    const paths = new Set<string>()

    const addPath = (value: any) => {
        if (!value) return
        const path = String(value).trim()
        if (path) paths.add(path)
    }

    payload.file_changes?.forEach((item) => {
        if (isPlainObject(item) && typeof item.path === 'string' && typeof item.content === 'string' && item.content.trim() !== '') {
            addPath(item.path)
        }
    })

    Object.entries(payload.generated_files || {}).forEach(([path, content]) => {
        if (typeof content === 'string' && content.trim() !== '') addPath(path)
    })

    Object.entries(payload.files || {}).forEach(([path, content]) => {
        if (typeof content === 'string' && content.trim() !== '') addPath(path)
    })

    const addStructuredListPaths = (entries: Array<string | { path?: string; content?: string }> | undefined) => {
        if (!Array.isArray(entries)) return
        entries.forEach((entry) => {
            if (isPlainObject(entry) && typeof entry.path === 'string' && typeof entry.content === 'string' && entry.content.trim() !== '') {
                addPath(entry.path)
            }
        })
    }

    addStructuredListPaths(payload.files_created)
    addStructuredListPaths(payload.files_modified)
    addStructuredListPaths(payload.created_files)
    addStructuredListPaths(payload.modified_files)
    addStructuredListPaths(payload.deleted_files)

    const result = payload.result
    if (isPlainObject(result)) {
        ;['created_files', 'files_created', 'modified_files', 'files_modified', 'deleted_files'].forEach((key) => {
            const nested = result[key]
            if (Array.isArray(nested)) {
                nested.forEach((item) => {
                    if (isPlainObject(item) && typeof item.path === 'string' && typeof item.content === 'string' && item.content.trim() !== '') {
                        addPath(item.path)
                    }
                })
            }
        })
    }

    const output = payload.output
    if (isPlainObject(output)) {
        ;['created_files', 'files_created', 'modified_files', 'files_modified', 'deleted_files'].forEach((key) => {
            const nested = output[key]
            if (Array.isArray(nested)) {
                nested.forEach((item) => {
                    if (isPlainObject(item) && typeof item.path === 'string' && typeof item.content === 'string' && item.content.trim() !== '') {
                        addPath(item.path)
                    }
                })
            }
        })
    }

    return Array.from(paths)
}

function parseCodeBlocks(text: string): (string | CodeBlock)[] {
    const parts: (string | CodeBlock)[] = []
    let lastIndex = 0
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
    let match

    while ((match = codeBlockRegex.exec(text)) !== null) {
        // Add text before code block
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index))
        }
        // Add code block
        parts.push({
            language: match[1] || 'plaintext',
            code: match[2].trim(),
        })
        lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex))
    }

    return parts.length > 0 ? parts : [text]
}

function extractJsonPayload(text: string): JsonResponsePayload | null {
    const trimmed = (text || '').trim()
    if (!trimmed) return null

    const unwrapped = trimmed
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()

    try {
        const parsed = JSON.parse(unwrapped)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as JsonResponsePayload
        }
    } catch {
        // fall through
    }

    const match = unwrapped.match(/\{[\s\S]*\}/)
    if (!match) return null

    try {
        const parsed = JSON.parse(match[0])
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as JsonResponsePayload
        }
    } catch {
        return null
    }

    return null
}

function StructuredJsonMessage({ payload }: { payload: JsonResponsePayload }) {
    const summary = payload.summary?.trim() || buildGenericJsonSummary(payload)
    const modifiedPaths = collectUniquePaths(payload)

    const hasStructuredFields = Boolean(
        payload.summary || payload.file_changes || payload.generated_files || payload.files || payload.files_created || payload.files_modified || payload.created_files || payload.modified_files || payload.deleted_files
    )

    return (
        <div className='min-w-0 max-w-full space-y-2 overflow-hidden'>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => <p className='whitespace-pre-wrap break-words [overflow-wrap:anywhere]'>{children}</p>,
                    ul: ({ children }) => <ul className='ml-5 list-disc space-y-1 break-words [overflow-wrap:anywhere]'>{children}</ul>,
                    li: ({ children }) => <li className='break-words [overflow-wrap:anywhere]'>{children}</li>,
                    pre: ({ children }) => <pre className='my-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere]'>{children}</pre>,
                    table: ({ children }) => (
                        <div className='my-3 max-w-full overflow-x-auto'>
                            <table className='w-full table-fixed border-collapse text-sm'>{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className='border-b border-border/70 bg-muted/40'>{children}</thead>,
                    tbody: ({ children }) => <tbody>{children}</tbody>,
                    tr: ({ children }) => <tr className='border-b border-border/40'>{children}</tr>,
                    th: ({ children }) => <th className='border border-border/60 px-2 py-1 text-left font-semibold break-words [overflow-wrap:anywhere]'>{children}</th>,
                    td: ({ children }) => <td className='border border-border/60 px-2 py-1 align-top break-words [overflow-wrap:anywhere]'>{children}</td>,
                    code: ({ children }) => <code className='rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] break-words [overflow-wrap:anywhere]'>{children}</code>,
                    a: ({ children, href }) => <a href={href} className='break-all underline'>{children}</a>,
                }}
            >
                {summary}
            </ReactMarkdown>
            {modifiedPaths.length > 0 ? (
                <div className='rounded-md border border-border/60 bg-background/50 p-2 text-xs'>
                    <div className='mb-1 font-medium text-muted-foreground'>Files touched</div>
                    <ul className='space-y-1'>
                        {modifiedPaths.map((path) => (
                            <li key={path} className='truncate font-mono text-xs'>
                                {path}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
            {!hasStructuredFields && payload.result && isPlainObject(payload.result) ? (
                <div className='rounded-md border border-border/60 bg-background/50 p-2 text-xs'>
                    <div className='mb-1 font-medium text-muted-foreground'>Result</div>
                    <pre className='overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-5'>
                        {JSON.stringify(payload.result, null, 2)}
                    </pre>
                </div>
            ) : null}
        </div>
    )
}


function CodeBlockComponent({ block }: { block: CodeBlock }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(block.code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.success('Copied to clipboard')
    }

    return (
        <div className='my-2 min-w-0 w-full max-w-full overflow-hidden rounded-lg bg-slate-900 p-4'>
            <div className='mb-2 flex items-center justify-between'>
                <span className='text-xs font-semibold text-slate-400'>{block.language || 'code'}</span>
                <button
                    onClick={handleCopy}
                    className='flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-slate-800'
                    title='Copy code'
                >
                    {copied ? (
                        <>
                            <Check className='h-3 w-3 text-green-500' /> Copied
                        </>
                    ) : (
                        <>
                            <Copy className='h-3 w-3' /> Copy
                        </>
                    )}
                </button>
            </div>
            <div className='min-w-0 w-full max-w-full overflow-x-auto text-sm'>
                <SyntaxHighlighter
                    language={block.language}
                    style={atomDark}
                    wrapLongLines
                    customStyle={{
                        margin: 0,
                        background: 'transparent',
                        maxWidth: '100%',
                        width: '100%',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}
                    codeTagProps={{
                        style: {
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                        },
                    }}
                >
                    {block.code}
                </SyntaxHighlighter>
            </div>
        </div>
    )
}

export function MessageFormatter({ content }: MessageFormatterProps) {
    const jsonPayload = extractJsonPayload(content)
    if (jsonPayload) {
        return <StructuredJsonMessage payload={jsonPayload} />
    }

    const parts = parseCodeBlocks(content)

    return (
        <div className='w-full min-w-0 max-w-full space-y-2 break-words [overflow-wrap:anywhere] overflow-hidden'>
            {parts.map((part, idx) => {
                if (typeof part === 'string') {
                    return (
                        <div
                            key={idx}
                            className='max-w-full min-w-0 break-words [overflow-wrap:anywhere] text-sm leading-6 text-inherit [&_*]:max-w-full [&_a]:break-all [&_li]:break-words [&_li]:[overflow-wrap:anywhere] [&_p]:break-words [&_p]:[overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:[overflow-wrap:anywhere] [&_table]:w-full [&_table]:table-fixed [&_th]:break-words [&_th]:[overflow-wrap:anywhere] [&_td]:break-words [&_td]:[overflow-wrap:anywhere]'
                        >
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({ children }) => <p className='mb-2 break-words [overflow-wrap:anywhere] last:mb-0'>{children}</p>,
                                    ul: ({ children }) => <ul className='mb-2 ml-5 list-disc space-y-1 break-words [overflow-wrap:anywhere]'>{children}</ul>,
                                    ol: ({ children }) => <ol className='mb-2 ml-5 list-decimal space-y-1 break-words [overflow-wrap:anywhere]'>{children}</ol>,
                                    li: ({ children }) => <li className='break-words [overflow-wrap:anywhere]'>{children}</li>,
                                    pre: ({ children }) => <pre className='my-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere]'>{children}</pre>,
                                    table: ({ children }) => (
                                        <div className='my-3 max-w-full overflow-x-auto'>
                                            <table className='w-full table-fixed border-collapse text-sm'>{children}</table>
                                        </div>
                                    ),
                                    thead: ({ children }) => <thead className='border-b border-border/70 bg-muted/40'>{children}</thead>,
                                    tbody: ({ children }) => <tbody>{children}</tbody>,
                                    tr: ({ children }) => <tr className='border-b border-border/40'>{children}</tr>,
                                    th: ({ children }) => <th className='border border-border/60 px-2 py-1 text-left font-semibold break-words [overflow-wrap:anywhere]'>{children}</th>,
                                    td: ({ children }) => <td className='border border-border/60 px-2 py-1 align-top break-words [overflow-wrap:anywhere]'>{children}</td>,
                                    strong: ({ children }) => <strong className='font-semibold break-words'>{children}</strong>,
                                    em: ({ children }) => <em className='italic break-words'>{children}</em>,
                                    code: ({ children }) => <code className='break-words [overflow-wrap:anywhere] rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]'>{children}</code>,
                                    a: ({ children, href }) => <a href={href} className='break-all underline'>{children}</a>,
                                }}
                            >
                                {part}
                            </ReactMarkdown>
                        </div>
                    )
                } else {
                    return <CodeBlockComponent key={idx} block={part} />
                }
            })}
        </div>
    )
}
