# Archon API Documentation

## Overview
Base URL: `http://localhost:8000`
Authentication: Bearer Token (JWT)

All API responses follow a standard JSON structure. Errors return appropriate HTTP status codes (4xx, 5xx) with an error details object.

---

## 1. Authentication
**Base URL:** `/api/auth`

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| `POST` | `/register/` | Register a new user | `{"email": "user@example.com", "username": "user", "password": "...", "password_confirm": "...", "full_name": "..."}` |
| `POST` | `/login/` | Obtain JWT pair | `{"email": "user@example.com", "password": "..."}` |
| `POST` | `/refresh/` | Refresh access token | `{"refresh": "token_string"}` |
| `POST` | `/logout/` | Blacklist refresh token | `{"refresh": "token_string"}` |
| `GET` | `/me/` | Get current user details | - |
| `PUT` | `/profile/update/` | Update user profile | `{"full_name": "...", "avatar_url": "...", "preferred_llm": "..."}` |
| `POST` | `/password/change/` | Change password | `{"old_password": "...", "new_password": "...", "new_password_confirm": "..."}` |

---

## 2. Projects
**Base URL:** `/api/projects`

| Method | Endpoint | Description | Request Body / Query Params |
|--------|----------|-------------|----------------------------|
| `GET` | `/` | List all projects | - |
| `POST` | `/` | Create project | `{"name": "My App", "description": "...", "repository_path": "...", "repository_url": "...", "language": "python", "framework": "django", "settings": {}}` |
| `GET` | `/{id}/` | Get project details | - |
| `PATCH`| `/{id}/` | Update project | `{"name": "...", "status": "active", ...}` (Same fields as create) |
| `DELETE`| `/{id}/` | Delete project | - |
| `POST` | `/{id}/archive/` | Archive project | - |
| `POST` | `/{id}/activate/` | Activate archived project | - |
| `GET` | `/{id}/stats/` | Get project statistics | - |
| `GET` | `/active/` | List active projects only | - |
| `GET` | `/archived/` | List archived projects only | - |

---

## 3. Context (File System)
**Base URL:** `/api/context`

### Files
**Endpoint:** `/files/`

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `GET` | `/` | List/Filter files | params: `?project={id}&file_type={code|pdf}&parent={id}` |
| `POST` | `/` | Create file entry manually | `{"project": "uuid", "file_path": "src/main.py", "file_name": "main.py", "file_type": "code", "content": "print('hello')", "parent_folder": "uuid"}` |
| `POST` | `/upload/` | Upload file | Multipart form: `file` (binary), `project` (uuid), `parent_folder` (uuid), `file_path` (string) |
| `POST` | `/index_directory/` | Index local folder | `{"project": "uuid", "directory_path": "/abs/path", "recursive": true, "include_patterns": ["*.py"], "exclude_patterns": ["*.pyc"], "analyze_code": true}` |
| `POST` | `/search/` | Text search in files | `{"query": "search term", "project": "uuid", "file_type": "code", "limit": 20}` |
| `GET` | `/{id}/children/` | List folder contents | Returns list of child files/folders |
| `GET` | `/{id}/analysis/` | Get code analysis | Returns functions, classes, imports metadata |
| `POST` | `/{id}/analyze/` | Trigger code analysis | - |

### Code Analysis
**Endpoint:** `/analysis/`
* `GET /`: List all stored analyses.
* `GET /{id}/`: Get specific analysis details.

---

## 4. Planning (Project Management)
**Base URL:** `/api/planning`

### Project Plans
**Endpoint:** `/plans/`

| Method | Endpoint | Description | Request Body / details |
|--------|----------|-------------|------------------------|
| `GET` | `/` | List plans | - |
| `POST` | `/` | Create plan for a project | `{"project": "uuid"}` |
| `GET` | `/{id}/tree/` | Get full feature tree (Hierarchy) | - |
| `POST` | `/{id}/set_active_feature/`| Set current focus feature | `{"feature_id": "uuid"}` |
| `GET` | `/{id}/statistics/` | Get completion status/stats | - |
| `POST` | `/{id}/process_message/` | **AI Planning**: Send user requirement to generate or update plan | `{"message": "Add a login page", "context": {}}` |
| `GET` | `/{id}/restore_session/` | Restore the current planning session context | - |
| `GET` | `/{id}/planning_context/` | Get context for the Executor Agent | - |
| `POST` | `/{id}/switch_feature/` | Switch context to another feature | `{"to_feature_id": "uuid", "from_feature_id": "uuid"}` |
| `GET` | `/{id}/next_suggestions/` | Get suggestions for what to work on next | `?limit=5` |
| `GET` | `/{id}/resumable_features/` | Get features that can be resumed | - |
| `POST` | `/{id}/report_task_completion/`| Report task success (from Agent) | `{"task_id": "uuid", "result": {}}` |
| `POST` | `/{id}/report_task_failure/` | Report task failure (from Agent) | `{"task_id": "uuid", "error": "Something went wrong"}` |

### Features
**Endpoint:** `/features/`

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `GET` | `/` | List features | `?plan={id}&parent={id}&root_only=true` |
| `POST` | `/` | Create feature | `{"plan": "uuid", "parent": "uuid", "name": "Feature Name", "description": "...", "priority": 5, "estimated_effort": 60, "dependencies": ["uuid"]}` |
| `GET` | `/{id}/` | Get feature details | - |
| `PUT` | `/{id}/` | Update feature | Same as create |
| `POST` | `/{id}/move/` | Move feature in tree/order | `{"new_parent": "uuid", "new_order_index": 1}` |
| `POST` | `/{id}/update_status/` | Update status | `{"status": "in_progress", "blocking_reason": "waiting for api"}`. Status: `backlog`, `todo`, `in_progress`, `blocked`, `completed` |
| `GET` | `/{id}/children/` | Get direct children | - |
| `GET` | `/{id}/descendants/` | Get all descendants (flat) | - |

### Tasks
**Endpoint:** `/tasks/`
* Standard CRUD for tasks.
* **Filter**: `?feature={id}&status={status}`
* **Create Body**: `{"feature": "uuid", "title": "Task title", "description": "...", "task_type": "coding", "order_index": 0}`
* **Actions**:
    * `POST /{id}/update_status/`: `{"status": "completed", "result": {}, "error_message": "...", "execution_time_seconds": 120}`. Status: `pending`, `running`, `completed`, `failed`, `skipped`

---

## 5. Agents (Execution Engine)
**Base URL:** `/api/agents`

### Sessions (`/sessions/`)
| Method | Endpoint | Description | Payload |
|--------|----------|-------------|---------|
| `GET` | `/` | List sessions | `?project={id}&status={active}` |
| `POST` | `/` | Create session | `{"project": "uuid", "feature": "uuid", "session_name": "Fix Bug", "agent_type": "coder", "goal": "Fix null pointer", "context": {}}` |
| `POST` | `/run/` | **Quick Run**: Create & Execute | `{"project": "uuid", "feature": "uuid", "goal": "Refactor utils", "agent_type": "general", "model_name": "gemini-1.5-pro"}` |
| `POST` | `/{id}/execute/` | Execute/Resume session | - |
| `POST` | `/{id}/pause/` | Pause execution | - |
| `POST` | `/{id}/resume/` | Resume paused session | - |
| `POST` | `/{id}/cancel/` | Stop execution | - |
| `POST` | `/{id}/update_status/` | Update status (manual) | `{"status": "completed", "result": {}}` |
| `GET` | `/{id}/progress/` | Get live progress stream info | - |

### Executions (`/executions/`)
* `GET /`: List individual execution steps.
* `POST /`: Create execution record `{"user": "id", "project": "id", "session": "id", "agent_type": "coder", "input_data": {}, "llm_provider": "openai"}`
* `POST /{id}/update_status/`: `{"status": "completed", "output_data": {}, "prompt_tokens": 100, "total_tokens": 200}`

### Tool Calls (`/tool-calls/`)
* `GET /`: List specific tool usages.
* `POST /`: `{"execution": "uuid", "tool_name": "read_file", "parameters": {}}`

---

## 6. Chat (human-AI Interaction)
**Base URL:** `/api/chat`

### Sessions
| Method | Endpoint | Description | Request Body / details |
|--------|----------|-------------|------------------------|
| `GET` | `/sessions/` | List chat history | `?project={id}&is_active=true` |
| `POST` | `/sessions/` | Start new chat | `{"project": "uuid", "title": "Chat about DB"}` |
| `POST` | `/send/` | **Main Chat Loop**: Send text, get AI response | `{"message": "Hello", "session_id": "uuid", "project_id": "uuid", "include_context": true, "include_memory": true, "stream": false}` |
| `GET` | `/sessions/{id}/messages/` | Get message history for session | `?limit=50&before_id={uuid}` |
| `POST` | `/sessions/{id}/clear/` | clear history | - |
| `POST` | `/sessions/{id}/regenerate/`| Regenerate last response | - |
| `POST` | `/messages/` | Manually add message | `{"session": "uuid", "role": "user", "content": "..."}` |

---

## 7. Memory (State Management)
**Base URL:** `/api/memory`

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| `GET` | `/short-term/` | List context/STM items | `?project={id}&session_id={id}` |
| `POST` | `/short-term/` | Create STM | `{"project": "uuid", "session_id": "uuid", "memory_key": "user_pref", "content": "dark mode", "memory_type": "context", "ttl_seconds": 3600}` |
| `GET` | `/long-term/` | List learned patterns/LTM | `?project={id}&category=pattern` |
| `POST` | `/long-term/` | Create LTM | `{"project": "uuid", "memory_key": "arch_pattern", "content": "MVC", "memory_category": "pattern", "importance_score": 0.8}` |
| `POST` | `/long-term/{id}/boost_importance/` | Reinforce a memory | `{"amount": 0.1}` |
| `POST` | `/management/search/` | Semantic/Fuzzy search across all memory | `{"query": "database", "project": "uuid", "memory_type": "both", "limit": 10}` |
| `POST` | `/management/consolidate/` | Move STM -> LTM (Manual trigger) | `{"session_id": "uuid", "project": "uuid", "importance_threshold": 0.6}` |
| `POST` | `/management/cleanup/` | Remove expired/low-priority memories | `{"project": "uuid", "cleanup_expired": true, "cleanup_low_importance": true}` |
| `POST` | `/management/create_snapshot/` | Backup memory state | `{"project": "uuid", "session_id": "uuid", "snapshot_name": "Backup 1"}` |

---

## 8. Vector Store (RAG)
**Base URL:** `/api/vector-store`

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| `POST` | `/embeddings/create_embedding/` | Manually embed text | `{"project": "uuid", "content": "text to embed", "document_type": "code", "source_id": "file.py"}` |
| `POST` | `/embeddings/create_bulk/` | Bulk embed | `{"project": "uuid", "documents": [{"content": "...", "document_type": "doc"}], "namespace": "default"}` |
| `POST` | `/search/` | Semantic search (Vector only) | `{"query": "login logic", "project": "uuid", "top_k": 5, "document_type": "code"}` |
| `POST` | `/hybrid_search/` | Keyword + Semantic search | `{"query": "login logic", "project": "uuid", "top_k": 5}` |
| `POST` | `/get-context/` | Get formatted context for LLM prompt | `{"query": "...", "project": "uuid", "max_tokens": 4000}` |
