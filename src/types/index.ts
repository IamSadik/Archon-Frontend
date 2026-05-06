export interface User {
    id: string
    username: string
    email: string
    full_name?: string
    avatar_url?: string
    preferred_llm?: string
    date_joined?: string
}

export interface ActivityLogEntry {
    id: string
    activity_type: string
    activity_label?: string
    description?: string | null
    metadata?: Record<string, any> | null
    project?: string | null
    project_name?: string | null
    created_at: string
}

export interface ProfileOverview {
    user: User
    stats: {
        total_projects: number
        active_projects: number
        archived_projects: number
        recent_sessions: number
        recent_activity: number
    }
    current_project?: Project | null
    recent_projects: Project[]
    recent_sessions: AgentSession[]
    recent_activity: ActivityLogEntry[]
}

export interface AuthResponse {
    access?: string
    refresh?: string
    access_token?: string
    refresh_token?: string
    user: User
    message?: string
}

export interface ForgotPasswordRequestResponse {
    message: string
    expires_in_seconds?: number
    delivery_mode?: 'console' | 'smtp' | string
    otp_preview?: string
}

export interface ForgotPasswordVerifyResponse {
    message: string
    reset_token: string
    expires_at: string
}

export interface ResetPasswordResponse {
    message: string
}

export interface IdeaWorkflow {
    original_prompt: string
    refined_prompt: string
}

export interface Project {
    id: string
    user?: string
    name: string
    description?: string
    repository_path?: string
    repository_url?: string
    language?: string
    framework?: string
    status: 'active' | 'archived' | 'deleted'
    settings?: {
        idea_workflow?: IdeaWorkflow
        [key: string]: any
    }
    created_at: string
    updated_at: string
}

export interface ProjectStats {
    project_id: string
    name: string
    status: string
    created_at: string
    settings?: Record<string, any>
}

export interface RefineIdeaRequest {
    idea_prompt: string
    name?: string
    language?: string
    framework?: string
    repository_path?: string
    repository_url?: string
    settings?: Record<string, any>
    auto_create?: boolean
}

export interface RefineIdeaResponse {
    message?: string
    project?: Project
    idea_prompt: string
    refined_prompt: string
}

export interface Plan {
    id: string
    project: string
    project_name?: string
    plan_version?: number
    active_feature?: string | null
    total_features?: number
    completed_features?: number
    completion_percentage?: number
    created_at: string
    updated_at: string
}

export interface Feature {
    id: string
    plan: string
    parent?: string | null
    name: string
    description?: string
    priority: number
    status: 'not_started' | 'in_progress' | 'paused' | 'blocked' | 'completed'
    blocking_reason?: string
    estimated_effort?: string
    dependencies?: string[]
    order_index: number
    depth_level?: number
    metadata?: Record<string, any>
    created_at: string
    updated_at: string
    children?: Feature[]
    tasks?: Task[]
}

export interface Task {
    id: string
    feature: string
    title: string
    description?: string
    task_type: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
    result?: any
    error_message?: string
    order_index: number
    created_at: string
    updated_at: string
}

export interface ToolCall {
    id: string
    execution: string
    tool_name: string
    tool_description?: string
    status?: 'pending' | 'running' | 'completed' | 'failed'
    parameters: any
    result?: any
    error_message?: string
    created_at?: string
    updated_at?: string
}

export interface AgentExecution {
    id: string
    session: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
    input_data?: any
    output_data?: any
    error_message?: string
    step_name?: string
    step_type?: string
    step_number?: number
    tool_calls?: ToolCall[]
    created_at: string
    updated_at?: string
    execution_time_ms?: number
}

export interface AgentSession {
    id: string
    project: string
    project_name?: string
    feature?: string | null
    feature_name?: string | null
    session_name: string
    agent_type: 'coder' | 'planner' | 'reviewer' | 'general'
    goal: string
    status: 'active' | 'paused' | 'completed' | 'failed' | 'cancelled'
    context?: Record<string, any>
    result?: any
    error_message?: string
    started_at?: string
    completed_at?: string | null
    last_activity_at?: string
    created_at: string
    updated_at: string
}

export interface ChatSession {
    id: string
    project?: string | null
    title?: string
    metadata?: Record<string, any>
    is_active?: boolean
    message_count?: number
    last_message_preview?: string | null
    last_message_at?: string | null
    is_pinned?: boolean
    created_at: string
    updated_at: string
}

export interface ChatMessage {
    id: string
    session?: string
    role: 'user' | 'assistant' | 'system' | 'function'
    content: string
    created_at: string
    metadata?: any
}

export interface ChatStreamChunk {
    type: 'chunk' | 'complete' | 'error'
    session_id: string
    message_id?: string
    content: string
    applied_files?: string[]
    telemetry?: {
        first_token_latency_ms?: number | null
        total_latency_ms?: number | null
    }
}

export interface CodeChangePreviewItem {
    path: string
    exists: boolean
    old_size: number
    new_size: number
    expected_hash?: string | null
    added_lines?: number
    removed_lines?: number
    diff: string
    content: string
}

export interface CodeChangesPreviewResponse {
    session_id: string
    summary: string
    file_changes: Array<{ path: string; content: string }>
    preview: CodeChangePreviewItem[]
    raw_response?: string
}

export interface MemoryItem {
    id: string
    project: string
    session_id?: string
    memory_key: string
    content: any
    memory_type: string
    category?: string
    importance_score?: number
    created_at: string
}

export interface SearchResult {
    id: string
    content: string
    score: number
    metadata?: Record<string, any>
}

export interface ContextFile {
    id: string
    project: string
    file_path: string
    file_name: string
    file_type: string
    file_extension?: string
    language?: string
    content?: string
    created_at: string
    updated_at: string
}

export interface FileNode {
    id: string
    project: string
    parent_folder?: string | null
    name: string
    file_path: string
    file_type: string
    size?: number
    content?: string
    created_at: string
    updated_at: string
    children?: FileNode[]
}

export interface IDETreeNode {
    path: string
    type: 'file' | 'folder'
    size_bytes?: number
    modified_at?: number
}

export interface IDERepoInitResponse {
    project_id: string
    repository_path: string
    initialized: boolean
}

export interface IDEReadFileResponse {
    path: string
    content: string
    size_bytes: number
}

export interface IDEWriteFileResponse {
    path: string
    size_bytes: number
}
