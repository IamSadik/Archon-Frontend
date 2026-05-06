export type EditorThemePreference =
    | 'system'
    | 'archon-light'
    | 'archon-dark'
    | 'archon-midnight'
    | 'archon-dracula'
    | 'archon-solarized'
    | 'archon-high-contrast'
    | 'archon-nord'
    | 'archon-gruvbox'
    | 'archon-tokyo-night'
    | 'archon-catppuccin'

export type WorkspaceContrast = 'balanced' | 'high' | 'low'
export type TreeDensity = 'compact' | 'comfortable' | 'spacious'
export type FolderIconStyle = 'classic' | 'open' | 'emoji' | 'minimal'
export type TreeAccent = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan' | 'lime' | 'fuchsia' | 'orange' | 'teal'
export type WordWrapMode = 'on' | 'off'

export interface WorkspacePreferences {
    editorTheme: EditorThemePreference
    contrast: WorkspaceContrast
    treeDensity: TreeDensity
    folderIconStyle: FolderIconStyle
    treeAccent: TreeAccent
    showLineNumbers: boolean
    showTreeGuides: boolean
    showFileExtensions: boolean
    wordWrap: WordWrapMode
    editorFontSize: number
}

const STORAGE_KEY = 'archon_workspace_preferences'

export const defaultWorkspacePreferences: WorkspacePreferences = {
    editorTheme: 'system',
    contrast: 'balanced',
    treeDensity: 'comfortable',
    folderIconStyle: 'classic',
    treeAccent: 'blue',
    showLineNumbers: true,
    showTreeGuides: true,
    showFileExtensions: true,
    wordWrap: 'on',
    editorFontSize: 14,
}

export const workspaceEditorThemeOptions: Array<{ value: EditorThemePreference; label: string; description: string }> = [
    { value: 'system', label: 'Follow system', description: 'Sync to the app light/dark mode.' },
    { value: 'archon-light', label: 'Archon Light', description: 'Clean bright editor with neutral contrast.' },
    { value: 'archon-dark', label: 'Archon Dark', description: 'Balanced dark surface for daily use.' },
    { value: 'archon-midnight', label: 'Midnight Neon', description: 'Deep navy with vivid accents.' },
    { value: 'archon-dracula', label: 'Dracula', description: 'Purple-forward moody developer theme.' },
    { value: 'archon-solarized', label: 'Solarized Light', description: 'Warm light background with soft contrast.' },
    { value: 'archon-high-contrast', label: 'High Contrast', description: 'Sharp contrast for focus and accessibility.' },
    { value: 'archon-nord', label: 'Nord', description: 'Cool arctic tones with soft blue syntax.' },
    { value: 'archon-gruvbox', label: 'Gruvbox', description: 'Warm earthy palette with retro contrast.' },
    { value: 'archon-tokyo-night', label: 'Tokyo Night', description: 'Deep blue night mode with neon clarity.' },
    { value: 'archon-catppuccin', label: 'Catppuccin', description: 'Creamy pastel contrast with rich accents.' },
]

export const workspaceContrastOptions: Array<{ value: WorkspaceContrast; label: string; description: string }> = [
    { value: 'balanced', label: 'Balanced', description: 'Default feel with moderate contrast.' },
    { value: 'high', label: 'High contrast', description: 'Sharper boundaries and stronger emphasis.' },
    { value: 'low', label: 'Low contrast', description: 'Soft surfaces for a calmer workspace.' },
]

export const treeDensityOptions: Array<{ value: TreeDensity; label: string; description: string }> = [
    { value: 'compact', label: 'Compact', description: 'Dense rows for large repos.' },
    { value: 'comfortable', label: 'Comfortable', description: 'Balanced spacing and scanability.' },
    { value: 'spacious', label: 'Spacious', description: 'Larger rows and more breathing room.' },
]

export const folderIconOptions: Array<{ value: FolderIconStyle; label: string; description: string }> = [
    { value: 'classic', label: 'Classic', description: 'Traditional folder icon.' },
    { value: 'open', label: 'Open folder', description: 'More open visual cue for navigation.' },
    { value: 'emoji', label: 'Smart icons', description: 'Adapts the folder glyph to the folder name.' },
    { value: 'minimal', label: 'Minimal', description: 'Subtle geometric folder chip.' },
]

export const treeAccentOptions: Array<{ value: TreeAccent; label: string; description: string }> = [
    { value: 'blue', label: 'Blue', description: 'Default Archon accent.' },
    { value: 'emerald', label: 'Emerald', description: 'Fresh green accent.' },
    { value: 'violet', label: 'Violet', description: 'Soft purple accent.' },
    { value: 'amber', label: 'Amber', description: 'Warm amber accent.' },
    { value: 'rose', label: 'Rose', description: 'Soft pink-red accent.' },
    { value: 'cyan', label: 'Cyan', description: 'Cool bright cyan accent.' },
    { value: 'lime', label: 'Lime', description: 'Lively green accent.' },
    { value: 'fuchsia', label: 'Fuchsia', description: 'Vivid pink-purple accent.' },
    { value: 'orange', label: 'Orange', description: 'Warm orange accent.' },
    { value: 'teal', label: 'Teal', description: 'Calm blue-green accent.' },
]

export function loadWorkspacePreferences(): WorkspacePreferences {
    if (typeof window === 'undefined') {
        return defaultWorkspacePreferences
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return defaultWorkspacePreferences
        const parsed = JSON.parse(raw) as Partial<WorkspacePreferences>
        return {
            ...defaultWorkspacePreferences,
            ...parsed,
        }
    } catch {
        return defaultWorkspacePreferences
    }
}

export function saveWorkspacePreferences(preferences: WorkspacePreferences) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}

export function resolveMonacoThemeName(preferences: WorkspacePreferences, resolvedTheme?: string | null) {
    if (preferences.editorTheme !== 'system') {
        return preferences.editorTheme
    }
    return resolvedTheme === 'dark' ? 'archon-dark' : 'archon-light'
}

export const treeAccentClasses: Record<TreeAccent, string> = {
    blue: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    violet: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    cyan: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    lime: 'text-lime-500 bg-lime-500/10 border-lime-500/20',
    fuchsia: 'text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20',
    orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    teal: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
}

export const treeDensityClasses: Record<TreeDensity, { row: string; indent: number; text: string }> = {
    compact: { row: 'py-1', indent: 12, text: 'text-xs' },
    comfortable: { row: 'py-1.5', indent: 15, text: 'text-sm' },
    spacious: { row: 'py-2', indent: 18, text: 'text-sm' },
}

export const contrastShellClasses: Record<WorkspaceContrast, string> = {
    balanced: 'border-border bg-background/70',
    high: 'border-2 border-foreground/20 bg-background',
    low: 'border-border/40 bg-muted/20',
}
