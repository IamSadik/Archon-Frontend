import api from '@/lib/api';
import { Plan, Feature, Task } from '@/types';

export const planningService = {
  // --- Plans ---
  async getPlans() {
    const response = await api.get<Plan[] | any>('/planning/plans/');
    // Handle pagination or results wrapper
    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.results)) {
      return response.data.results as Plan[];
    }
    return response.data as Plan[];
  },

  async createPlan(projectId: string) {
    const response = await api.post<Plan>('/planning/plans/', { project: projectId });
    return response.data;
  },

  async getPlan(planId: string) {
    const response = await api.get<Plan>(`/planning/plans/${planId}/`);
    return response.data;
  },

  async updatePlan(planId: string, data: any) {
    const response = await api.patch<Plan>(`/planning/plans/${planId}/`, data);
    return response.data;
  },

  async deletePlan(planId: string) {
    return api.delete(`/planning/plans/${planId}/`);
  },

  async getPlanTree(planId: string) {
    const response = await api.get<any>(`/planning/plans/${planId}/tree/`);
    // API returns { plan_id: ..., tree: [...] }
    if (response.data && response.data.tree && Array.isArray(response.data.tree)) {
      return response.data.tree as Feature[];
    }
    return response.data as Feature[];
  },

  async setActiveFeature(planId: string, featureId: string) {
    const response = await api.post(`/planning/plans/${planId}/set_active_feature/`, { feature_id: featureId });
    return response.data;
  },

  async getPlanStatistics(planId: string) {
    const response = await api.get(`/planning/plans/${planId}/statistics/`);
    return response.data;
  },

  async processMessage(planId: string, message: string, context: any = {}) {
    const response = await api.post(`/planning/plans/${planId}/process_message/`, {
      message,
      context
    });
    return response.data;
  },

  async restoreSession(planId: string) {
    const response = await api.get(`/planning/plans/${planId}/restore_session/`);
    return response.data;
  },

  async getPlanningContext(planId: string) {
    const response = await api.get(`/planning/plans/${planId}/planning_context/`);
    return response.data;
  },

  async switchFeature(planId: string, toFeatureId: string, fromFeatureId: string) {
    const response = await api.post(`/planning/plans/${planId}/switch_feature/`, {
      to_feature_id: toFeatureId,
      from_feature_id: fromFeatureId
    });
    return response.data;
  },

  async getNextSuggestions(planId: string, limit = 5) {
    const response = await api.get(`/planning/plans/${planId}/next_suggestions/`, { params: { limit } });
    return response.data;
  },

  async getResumableFeatures(planId: string) {
    const response = await api.get<Feature[]>(`/planning/plans/${planId}/resumable_features/`);
    return response.data;
  },

  async reportTaskCompletion(planId: string, taskId: string, result: any = {}) {
    const response = await api.post(`/planning/plans/${planId}/report_task_completion/`, {
      task_id: taskId,
      result
    });
    return response.data;
  },

  async reportTaskFailure(planId: string, taskId: string, error: string) {
    const response = await api.post(`/planning/plans/${planId}/report_task_failure/`, {
      task_id: taskId,
      error
    });
    return response.data;
  },

  // --- 🤖 AUTONOMOUS PLANNING ---
  async generateFromDescription(planId: string, description: string, maxFeatures = 10, includeTasks = true, autoCreate = true) {
    const response = await api.post(`/planning/plans/${planId}/generate_from_description/`, {
      description,
      max_features: maxFeatures,
      include_tasks: includeTasks,
      auto_create: autoCreate
    });
    return response.data;
  },

  async generateAutonomousPlan(projectId: string, projectName: string, description: string, maxFeatures = 15, includeTasks = true) {
    const response = await api.post('/planning/plans/generate_autonomous_plan/', {
      project_id: projectId,
      project_name: projectName,
      description,
      max_features: maxFeatures,
      include_tasks: includeTasks
    });
    return response.data;
  },

  // --- Features ---
  async getFeatures(planId: string, parentId?: string, rootOnly = false) {
    const params: any = { plan: planId };
    if (parentId) params.parent = parentId;
    if (rootOnly) params.root_only = true;

    const response = await api.get<Feature[] | any>('/planning/features/', { params });
    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.results)) {
      return response.data.results as Feature[];
    }
    return response.data as Feature[];
  },

  async createFeature(data: any) {
    const response = await api.post<Feature>('/planning/features/', data);
    return response.data;
  },

  async getFeature(featureId: string) {
    const response = await api.get<Feature>(`/planning/features/${featureId}/`);
    return response.data;
  },

  async updateFeature(featureId: string, data: any) {
    const response = await api.put<Feature>(`/planning/features/${featureId}/`, data);
    return response.data;
  },

  async deleteFeature(featureId: string) {
    return api.delete(`/planning/features/${featureId}/`);
  },

  async moveFeature(featureId: string, newParentId: string, newOrderIndex: number) {
    const response = await api.post(`/planning/features/${featureId}/move/`, {
      new_parent: newParentId,
      new_order_index: newOrderIndex
    });
    return response.data;
  },

  async updateFeatureStatus(featureId: string, status: string, blockingReason?: string, strictSerializedMode = true) {
    const response = await api.post(`/planning/features/${featureId}/update_status/`, {
      status,
      blocking_reason: blockingReason ?? "",
      strict_serialized_mode: strictSerializedMode,
    });
    return response.data;
  },

  async getFeatureChildren(featureId: string) {
    const response = await api.get<Feature[]>(`/planning/features/${featureId}/children/`);
    return response.data;
  },

  async getFeatureDescendants(featureId: string) {
    const response = await api.get<Feature[]>(`/planning/features/${featureId}/descendants/`);
    return response.data;
  },

  // --- Tasks ---
  async getTasks(featureId: string, status?: string) {
    const params: any = { feature: featureId };
    if (status) params.status = status;

    const response = await api.get<Task[] | any>('/planning/tasks/', { params });
    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.results)) {
      return response.data.results as Task[];
    }
    return response.data as Task[];
  },

  async createTask(data: any) {
    const response = await api.post<Task>('/planning/tasks/', data);
    return response.data;
  },

  async getTask(taskId: string) {
    const response = await api.get<Task>(`/planning/tasks/${taskId}/`);
    return response.data;
  },

  async updateTask(taskId: string, data: any) {
    const response = await api.put<Task>(`/planning/tasks/${taskId}/`, data);
    return response.data;
  },

  async deleteTask(taskId: string) {
    return api.delete(`/planning/tasks/${taskId}/`);
  },

  async updateTaskStatus(taskId: string, data: { status: string; result?: any; error_message?: string; execution_time_seconds?: number }) {
    const response = await api.post(`/planning/tasks/${taskId}/update_status/`, data);
    return response.data;
  }
};
