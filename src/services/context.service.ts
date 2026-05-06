import api from '@/lib/api';
import { ContextFile, FileNode, IDEReadFileResponse, IDERepoInitResponse, IDETreeNode, IDEWriteFileResponse } from '@/types';

const toFileNode = (file: any): FileNode => ({
  id: file.id,
  project: file.project,
  parent_folder: file.parent_folder,
  name: file.file_name || file.name || file.file_path,
  file_path: file.file_path,
  file_type: file.file_type,
  size: file.file_size_bytes,
  content: file.content,
  created_at: file.created_at,
  updated_at: file.updated_at,
});

export const contextService = {
  async getFiles(projectId: string, parentId?: string) {
    const params: any = { project: projectId };
    if (parentId) params.parent_folder = parentId;

    const response = await api.get<FileNode[] | any>('/context/files/', { params });
    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.results)) {
      return response.data.results.map(toFileNode) as FileNode[];
    }
    return (response.data || []).map(toFileNode) as FileNode[];
  },

  async initIDERepo(projectId: string) {
    const response = await api.post<IDERepoInitResponse>('/context/files/init_ide_repo/', {
      project: projectId,
    });
    return response.data;
  },

  async getIDETree(projectId: string, includeHidden = false) {
    const response = await api.get<{ project_id: string; nodes: IDETreeNode[] }>('/context/files/ide_tree/', {
      params: {
        project: projectId,
        include_hidden: includeHidden,
      },
    });
    return response.data;
  },

  async readIDEFile(projectId: string, filePath: string) {
    const response = await api.post<IDEReadFileResponse>('/context/files/read_ide_file/', {
      project: projectId,
      file_path: filePath,
    });
    return response.data;
  },

  async writeIDEFile(projectId: string, filePath: string, content: string, createDirs = true) {
    const response = await api.post<IDEWriteFileResponse>('/context/files/write_ide_file/', {
      project: projectId,
      file_path: filePath,
      content,
      create_dirs: createDirs,
    });
    return response.data;
  },

  async deleteIDEPath(projectId: string, path: string) {
    const response = await api.post('/context/files/delete_ide_path/', {
      project: projectId,
      path,
    });
    return response.data;
  },

  async clearIDERepo(projectId: string) {
    const response = await api.post('/context/files/clear_ide_repo/', {
      project: projectId,
    });
    return response.data;
  },

  async renameIDEPath(projectId: string, oldPath: string, newPath: string) {
    const response = await api.post('/context/files/rename_ide_path/', {
      project: projectId,
      old_path: oldPath,
      new_path: newPath,
    });
    return response.data;
  },

  async createIDEFolder(projectId: string, path: string) {
    const response = await api.post('/context/files/create_ide_folder/', {
      project: projectId,
      path,
    });
    return response.data;
  },

  async copyIDEPath(projectId: string, sourcePath: string, destinationPath: string) {
    const response = await api.post('/context/files/copy_ide_path/', {
      project: projectId,
      source_path: sourcePath,
      destination_path: destinationPath,
    });
    return response.data;
  },

  getIDERepoDownloadUrl(projectId: string) {
    const baseURL = api.defaults.baseURL || '';
    return `${baseURL}/context/files/download_ide_repo/?project=${projectId}`;
  },

  async uploadFile(projectId: string, file: File, parentId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project', projectId);
    if (parentId) formData.append('parent_folder', parentId);

    const response = await api.post<ContextFile>('/context/files/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return toFileNode(response.data);
  },

  async indexDirectory(projectId: string, path: string) {
    const response = await api.post('/context/files/index_directory/', {
      project: projectId,
      directory_path: path,
      recursive: true,
      analyze_code: true
    });
    return response.data;
  },

  async getFileContent(fileId: string) {
    // This assumes we might need to fetch content if not in the list view,
    // though the provided API doc doesn't explicitly have a 'get content' endpoint besides list.
    // Assuming the detail view '/context/files/{id}/' works or similar.
    // For now, let's use the list endpoint or specific detail if available.
    // Actually API Doc says: GET /{id}/children/ but not /{id}/ content.
    // However, usually GET /{id}/ returns details.
    const response = await api.get<ContextFile>(`/context/files/${fileId}/`);
    return toFileNode(response.data);
  },

  async searchFiles(projectId: string, query: string) {
    const response = await api.post('/context/files/search/', {
      project: projectId,
      query,
      file_type: 'code'
    });
    return response.data;
  },

  async getFileChildren(fileId: string) {
    const response = await api.get<ContextFile[]>(`/context/files/${fileId}/children/`);
    return (response.data || []).map(toFileNode);
  },

  async getFileAnalysis(fileId: string) {
    const response = await api.get(`/context/files/${fileId}/analysis/`);
    return response.data;
  },

  async triggerFileAnalysis(fileId: string) {
    const response = await api.post(`/context/files/${fileId}/analyze/`);
    return response.data;
  },

  async getAllAnalysis() {
    const response = await api.get('/context/analysis/');
    return response.data;
  },

  async getAnalysis(id: string) {
    const response = await api.get(`/context/analysis/${id}/`);
    return response.data;
  }
};
