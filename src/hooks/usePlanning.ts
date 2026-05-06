import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planningService } from '@/services';

export const usePlans = () => {
  return useQuery({
    queryKey: ['plans'],
    queryFn: planningService.getPlans,
  });
};

export const usePlanTree = (planId: string) => {
  return useQuery({
    queryKey: ['plan', planId, 'tree'],
    queryFn: () => planningService.getPlanTree(planId),
    enabled: !!planId,
  });
};

export const usePlan = (planId: string) => {
  return useQuery({
    queryKey: ['plan', planId],
    queryFn: () => planningService.getPlan(planId),
    enabled: !!planId,
  });
};

export const useCreatePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => planningService.createPlan(projectId),
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plans', projectId] });
    },
  });
};

export const useDeletePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => planningService.deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
};

export const usePlanStatistics = (planId: string) => {
  return useQuery({
    queryKey: ['plan', planId, 'statistics'],
    queryFn: () => planningService.getPlanStatistics(planId),
    enabled: !!planId,
  });
};

export const useSetActiveFeature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, featureId }: { planId: string; featureId: string }) =>
      planningService.setActiveFeature(planId, featureId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['plan', variables.planId, 'tree'] });
    },
  });
};

export const useNextSuggestions = (planId: string) => {
  return useQuery({
    queryKey: ['plan', planId, 'suggestions'],
    queryFn: () => planningService.getNextSuggestions(planId),
    enabled: !!planId,
  });
};

export const useResumableFeatures = (planId: string) => {
  return useQuery({
    queryKey: ['plan', planId, 'resumable'],
    queryFn: () => planningService.getResumableFeatures(planId),
    enabled: !!planId,
  });
};

export const usePlanningContext = (planId: string) => {
  return useQuery({
    queryKey: ['plan', planId, 'context'],
    queryFn: () => planningService.getPlanningContext(planId),
    enabled: !!planId,
  });
};

// --- Features Hooks ---

export const useFeature = (featureId: string) => {
  return useQuery({
    queryKey: ['feature', featureId],
    queryFn: () => planningService.getFeature(featureId),
    enabled: !!featureId,
  });
};

export const useCreateFeature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => planningService.createFeature(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plan', data.plan, 'tree'] });
      queryClient.invalidateQueries({ queryKey: ['plan', data.plan, 'statistics'] });
    }
  });
};

export const useUpdateFeature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ featureId, data }: { featureId: string; data: any }) =>
      planningService.updateFeature(featureId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feature', data.id] });
      queryClient.invalidateQueries({ queryKey: ['plan', data.plan, 'tree'] });
    }
  });
};

export const useUpdateFeatureStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ featureId, status, blockingReason, strictSerializedMode = true }: { featureId: string; status: string; blockingReason?: string; strictSerializedMode?: boolean }) =>
      planningService.updateFeatureStatus(featureId, status, blockingReason, strictSerializedMode),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feature', data.id] });
      queryClient.invalidateQueries({ queryKey: ['plan', data.plan, 'tree'] });
      queryClient.invalidateQueries({ queryKey: ['plan', data.plan, 'statistics'] });
    }
  });
};

export const useMoveFeature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ featureId, newParentId, newOrderIndex }: { featureId: string; newParentId: string; newOrderIndex: number }) =>
      planningService.moveFeature(featureId, newParentId, newOrderIndex),
    onSuccess: (data) => {
      // We need the plan ID to invalidate the tree. 
      // The response typically contains the updated feature which has the plan ID.
      if (data?.plan) {
        queryClient.invalidateQueries({ queryKey: ['plan', data.plan, 'tree'] });
      }
    }
  });
};

export const useDeleteFeature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (featureId: string) => planningService.deleteFeature(featureId),
    onSuccess: () => {
      // Hard to know plan ID here without passing it or getting it from response.
      // Usually we would invalidate all 'plan-trees' or require the caller to handle invalidation.
      // For safety, we can invalidate keys matching standard patterns if we knew them.
      // Better: accept planId as argument or rely on parent component refetch.
      queryClient.invalidateQueries({ queryKey: ['plan'] }); // A bit aggressive but safe
    }
  });
};

// --- Tasks Hooks ---

export const useTasks = (featureId: string) => {
  return useQuery({
    queryKey: ['tasks', featureId],
    queryFn: () => planningService.getTasks(featureId),
    enabled: !!featureId,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => planningService.createTask(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.feature] });
    }
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status, result, error }: { taskId: string; status: string; result?: any; error?: string }) =>
      planningService.updateTaskStatus(taskId, { status, result, error_message: error }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.feature] });
    }
  });
};

export const useTask = (taskId: string) => {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => planningService.getTask(taskId),
    enabled: !!taskId,
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
      planningService.updateTask(taskId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', data.feature] });
    }
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => planningService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
};

export const useSwitchFeature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, toFeatureId, fromFeatureId }: { planId: string; toFeatureId: string; fromFeatureId: string }) =>
      planningService.switchFeature(planId, toFeatureId, fromFeatureId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan', variables.planId] });
    }
  });
};

export const useRestoreSession = (planId: string) => {
  return useQuery({
    queryKey: ['plan', planId, 'session'],
    queryFn: () => planningService.restoreSession(planId),
    enabled: !!planId,
    retry: false,
  });
};

export const useReportTaskCompletion = () => {
  return useMutation({
    mutationFn: ({ planId, taskId, result }: { planId: string; taskId: string; result?: any }) =>
      planningService.reportTaskCompletion(planId, taskId, result),
  });
};

export const useReportTaskFailure = () => {
  return useMutation({
    mutationFn: ({ planId, taskId, error }: { planId: string; taskId: string; error: string }) =>
      planningService.reportTaskFailure(planId, taskId, error),
  });
};

export const useFeatureChildren = (featureId: string) => {
  return useQuery({
    queryKey: ['feature', featureId, 'children'],
    queryFn: () => planningService.getFeatureChildren(featureId),
    enabled: !!featureId,
  });
};

export const useProcessPlanningMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, message, context }: { planId: string; message: string; context?: any }) =>
      planningService.processMessage(planId, message, context),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['plan', variables.planId, 'tree'] });
    },
  });
};

// --- 🤖 AUTONOMOUS PLANNING HOOKS ---
export const useGenerateFromDescription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      description,
      maxFeatures = 10,
      includeTasks = true,
      autoCreate = true
    }: {
      planId: string;
      description: string;
      maxFeatures?: number;
      includeTasks?: boolean;
      autoCreate?: boolean;
    }) => planningService.generateFromDescription(planId, description, maxFeatures, includeTasks, autoCreate),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['plan', variables.planId, 'tree'] });
      queryClient.invalidateQueries({ queryKey: ['plan', variables.planId, 'statistics'] });
    },
  });
};

export const useGenerateAutonomousPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      projectName,
      description,
      maxFeatures = 15,
      includeTasks = true
    }: {
      projectId: string;
      projectName: string;
      description: string;
      maxFeatures?: number;
      includeTasks?: boolean;
    }) => planningService.generateAutonomousPlan(projectId, projectName, description, maxFeatures, includeTasks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
};
