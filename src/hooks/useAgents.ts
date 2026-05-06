import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService } from '@/services';

export const useAgentSessions = (projectId: string) => {
  return useQuery({
    queryKey: ['agent-sessions', projectId],
    queryFn: () => agentService.getSessions(projectId),
    enabled: !!projectId,
  });
};

export const useCreateAgentSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: agentService.createSession,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-sessions', variables.project] });
    },
  });
};

export const useAgentProgress = (sessionId: string) => {
  return useQuery({
    queryKey: ['agent-progress', sessionId],
    queryFn: () => agentService.getSessionProgress(sessionId),
    enabled: !!sessionId,
    refetchInterval: 2000,
  });
};
