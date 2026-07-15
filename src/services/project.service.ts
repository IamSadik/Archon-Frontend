import api from '@/lib/api';
import { Project, ProjectStats, RefineIdeaRequest, RefineIdeaResponse } from '@/types';

export const projectService = {
  async getAllProjects() {
    const response = await api.get<Project[] | any>('/projects/');
    // Handle potential Django Rest Framework pagination ({ count: ..., results: [...] })
    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.results)) {
      return response.data.results as Project[];
    }
    return response.data as Project[];
  },

  async createProject(data: Partial<Project>) {
    const response = await api.post<Project>('/projects/', data);
    return response.data;
  },

  async refineIdea(data: RefineIdeaRequest) {
    const response = await api.post<RefineIdeaResponse>('/projects/refine_idea/', {
      ...data,
      auto_create: false,
    });
    return response.data;
  },

  async refineIdeaAndCreateProject(data: RefineIdeaRequest) {
    const response = await api.post<RefineIdeaResponse>('/projects/refine_idea/', {
      ...data,
      auto_create: data.auto_create ?? true,
    });
    return response.data;
  },

  async getProject(id: string) {
    const response = await api.get<Project>(`/projects/${id}/`);
    return response.data;
  },

  async updateProject(id: string, data: Partial<Project>) {
    const response = await api.patch<Project>(`/projects/${id}/`, data);
    return response.data;
  },

  async deleteProject(id: string) {
    return api.delete(`/projects/${id}/`);
  },

  async getProjectStats(id: string) {
    const response = await api.get<ProjectStats>(`/projects/${id}/stats/`);
    return response.data;
  },

  async getRecentFileChanges(id: string, limit = 12) {
    const response = await api.get<{
      project_id: string
      files: Array<{ path: string; at: string; source: string }>
    }>(`/projects/${id}/recent_file_changes/`, {
      params: { limit },
    })
    return response.data
  },

  async archiveProject(id: string) {
    const response = await api.post(`/projects/${id}/archive/`);
    return response.data;
  },

  async activateProject(id: string) {
    const response = await api.post(`/projects/${id}/activate/`);
    return response.data;
  },

  async getActiveProjects() {
    const response = await api.get<Project[]>('/projects/active/');
    return response.data;
  },

  async getArchivedProjects() {
    const response = await api.get<Project[]>('/projects/archived/');
    return response.data;
  }
};
