import api from '@/lib/api';
import { AgentSession, AgentExecution } from '@/types';

interface CreateSessionParams {
  project: string;
  feature?: string;
  session_name: string;
  agent_type: string;
  goal: string;
  context?: any;
}

export const agentService = {
  async getSessions(projectId: string) {
    const response = await api.get<AgentSession[] | any>('/agents/sessions/', {
      params: { project: projectId }
    });
    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.results)) {
      return response.data.results as AgentSession[];
    }
    return response.data as AgentSession[];
  },

  async createSession(data: CreateSessionParams) {
    const response = await api.post<AgentSession>('/agents/sessions/', data);
    return response.data;
  },

  async startExecution(sessionId: string) {
    const response = await api.post(`/agents/sessions/${sessionId}/execute/`);
    return response.data;
  },

  async getExecutions(sessionId: string) {
    const response = await api.get<AgentExecution[] | any>('/agents/executions/', {
      params: { session: sessionId }
    });
    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.results)) {
      return response.data.results as AgentExecution[];
    }
    return response.data as AgentExecution[];
  },

  async getSessionProgress(sessionId: string) {
    const response = await api.get(`/agents/sessions/${sessionId}/progress/`);
    return response.data;
  },

  async createQuickRun(data: { project: string; feature: string; goal: string; agent_type: string; model_name?: string }) {
    const response = await api.post('/agents/sessions/run/', data);
    return response.data;
  },

  async pauseSession(sessionId: string) {
    const response = await api.post(`/agents/sessions/${sessionId}/pause/`);
    return response.data;
  },

  async resumeSession(sessionId: string) {
    const response = await api.post(`/agents/sessions/${sessionId}/resume/`);
    return response.data;
  },

  async cancelSession(sessionId: string) {
    const response = await api.post(`/agents/sessions/${sessionId}/cancel/`);
    return response.data;
  },

  async updateSessionStatus(sessionId: string, status: string, result: any = {}) {
    const response = await api.post(`/agents/sessions/${sessionId}/update_status/`, { status, result });
    return response.data;
  },

  // Reset a failed session to allow retry
  async resetSession(sessionId: string) {
    const response = await api.post(`/agents/sessions/${sessionId}/update_status/`, {
      status: 'paused'
    });
    return response.data;
  },

  // Delete a session
  async deleteSession(sessionId: string) {
    const response = await api.delete(`/agents/sessions/${sessionId}/`);
    return response.data;
  },

  // Executions
  async createExecution(data: any) {
    const response = await api.post('/agents/executions/', data);
    return response.data;
  },

  async updateExecutionStatus(executionId: string, data: { status: string; output_data?: any; prompt_tokens?: number; total_tokens?: number }) {
    const response = await api.post(`/agents/executions/${executionId}/update_status/`, data);
    return response.data;
  },

  // Tool Calls
  async getToolCalls(executionId?: string) {
    const params: any = {};
    if (executionId) params.execution = executionId;

    const response = await api.get('/agents/tool-calls/', { params });
    return response.data;
  },

  async createToolCall(data: { execution: string; tool_name: string; parameters: any }) {
    const response = await api.post('/agents/tool-calls/', data);
    return response.data;
  }
};
