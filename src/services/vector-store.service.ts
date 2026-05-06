import api from '@/lib/api';
import { SearchResult } from '@/types';

export const vectorStoreService = {
  async search(projectId: string, query: string, topK = 5) {
    const response = await api.post<SearchResult[]>('/vector-store/search/', {
      project: projectId,
      query,
      top_k: topK,
      document_type: 'code'
    });
    return response.data;
  },

  async hybridSearch(projectId: string, query: string, topK = 5) {
    const response = await api.post<SearchResult[]>('/vector-store/hybrid_search/', {
      project: projectId,
      query,
      top_k: topK
    });
    return response.data;
  },

  async createEmbedding(data: { project: string; content: string; document_type: string; source_id: string }) {
    const response = await api.post('/vector-store/embeddings/create_embedding/', data);
    return response.data;
  },

  async createBulkEmbeddings(data: { project: string; documents: Array<{ content: string; document_type: string }>; namespace?: string }) {
    const response = await api.post('/vector-store/embeddings/create_bulk/', data);
    return response.data;
  },

  async getContext(projectId: string, query: string, maxTokens = 4000) {
    const response = await api.post('/vector-store/get-context/', {
      project: projectId,
      query,
      max_tokens: maxTokens
    });
    return response.data;
  }
};
