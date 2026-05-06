import api from '@/lib/api';
import { MemoryItem } from '@/types';

export const memoryService = {
  async getShortTerm(projectId: string, sessionId?: string) {
    const params: any = { project: projectId };
    if (sessionId) params.session_id = sessionId;
    const response = await api.get<MemoryItem[] | any>('/memory/short-term/', { params });
    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.results)) {
        return response.data.results as MemoryItem[];
    }
    return response.data as MemoryItem[];
  },

  async createShortTerm(data: Partial<MemoryItem>) {
    const response = await api.post<MemoryItem>('/memory/short-term/', data);
    return response.data;
  },

  async getLongTerm(projectId: string, category?: string) {
    const params: any = { project: projectId };
    if (category) params.category = category;
    const response = await api.get<MemoryItem[] | any>('/memory/long-term/', { params });
    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.results)) {
        return response.data.results as MemoryItem[];
    }
    return response.data as MemoryItem[];
  },

  async createLongTerm(data: Partial<MemoryItem>) {
    const response = await api.post<MemoryItem>('/memory/long-term/', data);
    return response.data;
  },

  async search(projectId: string, query: string, limit = 10) {
    const response = await api.post('/memory/management/search/', {
      project: projectId,
      query,
      limit,
      memory_type: 'both' // Default to both
    });
    return response.data;
  },

  async boostImportance(memoryId: string, amount: number) {
    const response = await api.post(`/memory/long-term/${memoryId}/boost_importance/`, { amount });
    return response.data;
  },

  async consolidate(projectId: string, sessionId: string, threshold = 0.6) {
    const response = await api.post('/memory/management/consolidate/', {
      project: projectId,
      session_id: sessionId,
      importance_threshold: threshold
    });
    return response.data;
  },

  async cleanup(projectId: string, expired = true, lowImportance = true) {
    const response = await api.post('/memory/management/cleanup/', {
      project: projectId,
      cleanup_expired: expired,
      cleanup_low_importance: lowImportance
    });
    return response.data;
  },

  async createSnapshot(projectId: string, sessionId: string, name: string) {
    const response = await api.post('/memory/management/create_snapshot/', {
      project: projectId,
      session_id: sessionId,
      snapshot_name: name
    });
    return response.data;
  }
};
