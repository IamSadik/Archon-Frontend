import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@/services';

export const useChatSessions = (projectId: string) => {
  return useQuery({
    queryKey: ['chat', projectId, 'sessions'],
    queryFn: () => chatService.getSessions(projectId),
    enabled: !!projectId,
    staleTime: 20_000,
    retry: 4,
    retryDelay: (attempt) => Math.min(attempt * 2000, 8000),
    placeholderData: (previousData) => previousData,
  });
};

export const useChatMessages = (sessionId: string) => {
  return useQuery({
    queryKey: ['chat', 'session', sessionId, 'messages'],
    queryFn: () => chatService.getMessages(sessionId),
    enabled: !!sessionId,
    retry: 4,
    retryDelay: (attempt) => Math.min(attempt * 2000, 8000),
    // Poll every 3 seconds for new messages if needed, or use websockets (preferred)
    // refetchInterval: 3000, 
  });
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ project, title }: { project: string; title: string }) =>
      chatService.createSession(project, title),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat', variables.project, 'sessions'] });
    },
  });
};

export const usePinSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, pinned, projectId }: { sessionId: string; pinned: boolean; projectId: string }) =>
      chatService.pinSession(sessionId, pinned),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat', variables.projectId, 'sessions'] });
    },
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      projectId,
      message,
      applyCodeChanges,
      focusMode,
      focusPath,
      selectedFilePath,
      selectedFileContent,
    }: {
      sessionId: string;
      projectId: string;
      message: string;
      applyCodeChanges?: boolean;
      focusMode?: 'codebase' | 'folder' | 'file';
      focusPath?: string;
      selectedFilePath?: string;
      selectedFileContent?: string;
    }) =>
      chatService.sendMessage(sessionId, projectId, message, {
        applyCodeChanges,
        focusMode,
        focusPath,
        selectedFilePath,
        selectedFileContent,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'session', variables.sessionId, 'messages'] });
    },
  });
};

