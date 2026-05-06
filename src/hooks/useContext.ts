import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contextService } from '@/services';

export const useFiles = (projectId: string, parentId?: string) => {
  return useQuery({
    queryKey: ['files', projectId, parentId],
    queryFn: () => contextService.getFiles(projectId, parentId),
    enabled: !!projectId,
  });
};

export const useFileContent = (fileId: string) => {
    return useQuery({
        queryKey: ['file-content', fileId],
        queryFn: () => contextService.getFileContent(fileId),
        enabled: !!fileId
    });
};

export const useUploadFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, file, parentId }: { projectId: string; file: File; parentId?: string }) =>
      contextService.uploadFile(projectId, file, parentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files', variables.projectId] });
    },
  });
};
