import api from '@/lib/api';
import { ChatSession, ChatMessage, ChatStreamChunk, CodeChangesPreviewResponse } from '@/types';
import { getCookie } from '@/lib/cookies';
import { isRetryableBackendError, wakeBackend } from '@/lib/backend-health';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const chatService = {
  async getSessions(projectId: string) {
    const response = await api.get<ChatSession[] | any>('/chat/sessions/', {
      params: { project: projectId }
    });
    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.results)) {
      return response.data.results as ChatSession[];
    }
    return response.data as ChatSession[];
  },

  async createSession(projectId: string, title: string) {
    const response = await api.post<ChatSession>('/chat/sessions/', {
      project: projectId,
      title
    });
    return response.data;
  },

  async pinSession(sessionId: string, pinned: boolean) {
    const response = await api.post<ChatSession>(`/chat/sessions/${sessionId}/pin/`, {
      pinned,
    });
    return response.data;
  },

  async renameSession(sessionId: string, title: string) {
    const response = await api.post<ChatSession>(`/chat/sessions/${sessionId}/rename/`, { title });
    return response.data;
  },

  async archiveSession(sessionId: string, archived: boolean) {
    const response = await api.post<ChatSession>(`/chat/sessions/${sessionId}/archive/`, { archived });
    return response.data;
  },

  async deleteSession(sessionId: string) {
    const response = await api.delete(`/chat/sessions/${sessionId}/`);
    return response.data;
  },

  async getMessages(sessionId: string) {
    const response = await api.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages/`);
    return response.data;
  },

  async sendMessage(
    sessionId: string,
    projectId: string,
    message: string,
    options?: {
      applyCodeChanges?: boolean;
      focusMode?: 'codebase' | 'folder' | 'file';
      focusPath?: string;
      selectedFilePath?: string;
      selectedFileContent?: string;
      includeContext?: boolean;
      includeMemory?: boolean;
    }
  ) {
    const response = await api.post('/chat/send/', {
      session_id: sessionId,
      project_id: projectId,
      message,
      apply_code_changes: options?.applyCodeChanges ?? false,
      focus_mode: options?.focusMode ?? 'codebase',
      focus_path: options?.focusPath,
      selected_file_path: options?.selectedFilePath,
      selected_file_content: options?.selectedFileContent,
      include_context: options?.includeContext ?? true,
      include_memory: options?.includeMemory ?? true,
    });
    return response.data;
  },

  async streamMessage(
    sessionId: string,
    projectId: string,
    message: string,
    options?: {
      applyCodeChanges?: boolean;
      focusMode?: 'codebase' | 'folder' | 'file';
      focusPath?: string;
      selectedFilePath?: string;
      selectedFileContent?: string;
      includeContext?: boolean;
      includeMemory?: boolean;
      onChunk?: (chunk: ChatStreamChunk) => void;
    }
  ) {
    const baseURL = api.defaults.baseURL || '';
    const endpoint = `${baseURL}/chat/stream-sse/`;
    const token = getCookie('auth_token');

    let response: Response | null = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (attempt === 0) {
        await wakeBackend();
      } else {
        await sleep(attempt * 2000);
      }

      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          session_id: sessionId,
          project_id: projectId,
          message,
          apply_code_changes: options?.applyCodeChanges ?? false,
          focus_mode: options?.focusMode ?? 'codebase',
          focus_path: options?.focusPath,
          selected_file_path: options?.selectedFilePath,
          selected_file_content: options?.selectedFileContent,
          include_context: options?.includeContext ?? true,
          include_memory: options?.includeMemory ?? true,
        }),
      });

      if (response.ok) {
        break;
      }

      if (!isRetryableBackendError(response.status) || attempt === 3) {
        const text = await response.text();
        throw new Error(text || `Streaming request failed (${response.status})`);
      }
    }

    if (!response || !response.ok || !response.body) {
      throw new Error('Streaming request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalChunk: ChatStreamChunk | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        try {
          const chunk = JSON.parse(payload) as ChatStreamChunk;
          options?.onChunk?.(chunk);
          if (chunk.type === 'complete') {
            finalChunk = chunk;
          }
          if (chunk.type === 'error') {
            throw new Error(chunk.content || 'Streaming error');
          }
        } catch (err) {
          if (err instanceof Error && err.message !== 'Unexpected end of JSON input') {
            throw err;
          }
        }
      }
    }

    if (!finalChunk) {
      throw new Error('Stream ended without completion event');
    }
    return finalChunk;
  },

  async previewCodeChanges(
    sessionId: string,
    projectId: string,
    message: string,
    options?: {
      focusMode?: 'codebase' | 'folder' | 'file';
      focusPath?: string;
      selectedFilePath?: string;
      selectedFileContent?: string;
      includeContext?: boolean;
      includeMemory?: boolean;
    }
  ) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (attempt === 0) {
        await wakeBackend();
      } else {
        await sleep(attempt * 2000);
      }

      try {
        const response = await api.post<CodeChangesPreviewResponse>('/chat/preview/', {
          session_id: sessionId,
          project_id: projectId,
          message,
          focus_mode: options?.focusMode ?? 'codebase',
          focus_path: options?.focusPath,
          selected_file_path: options?.selectedFilePath,
          selected_file_content: options?.selectedFileContent,
          include_context: options?.includeContext ?? true,
          include_memory: options?.includeMemory ?? true,
        });
        return response.data;
      } catch (error: any) {
        const status = error?.response?.status;
        if (!isRetryableBackendError(status) || attempt === 3) {
          throw error;
        }
      }
    }

    throw new Error('Preview request failed after retries');
  },

  async applyReviewedChanges(
    sessionId: string,
    fileChanges: Array<{ path: string; content: string }>,
    summary?: string,
    message?: string,
  ) {
    const response = await api.post('/chat/apply/', {
      session_id: sessionId,
      file_changes: fileChanges,
      summary,
      message,
    });
    return response.data;
  },

  async clearHistory(sessionId: string) {
    const response = await api.post(`/chat/sessions/${sessionId}/clear/`);
    return response.data;
  },

  async regenerateResponse(sessionId: string) {
    const response = await api.post(`/chat/sessions/${sessionId}/regenerate/`);
    return response.data;
  },

  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
    const response = await api.post('/chat/messages/', {
      session: sessionId,
      role,
      content
    });
    return response.data;
  }
};
