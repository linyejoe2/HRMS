import { api } from './api';

export type KanbanStatus = 'Backlog' | 'To Do' | 'In Progress' | 'Testing' | 'Done';

export interface KanbanHistoryEntry {
  action: 'created' | 'moved' | 'modified' | 'deleted' | 'restored';
  performedBy: string;
  performedByName: string;
  timestamp: string;
  details?: string;
  fromStatus?: KanbanStatus;
  toStatus?: KanbanStatus;
}

export interface KanbanTask {
  _id: string;
  title: string;
  content: string;
  files: string[];
  author: string;
  authorName: string;
  executor?: string;
  executorName?: string;
  status: KanbanStatus;
  deprecated: boolean;
  history: KanbanHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupedTasks {
  Backlog?: KanbanTask[];
  'To Do'?: KanbanTask[];
  'In Progress'?: KanbanTask[];
  Testing?: KanbanTask[];
  Done?: KanbanTask[];
  Deprecated?: KanbanTask[];
}

export interface CreateTaskData {
  title: string;
  content?: string;
  executor?: string;
  executorName?: string;
  status?: KanbanStatus;
}

export interface UpdateTaskData {
  title?: string;
  content?: string;
  executor?: string;
  executorName?: string;
  status?: KanbanStatus;
}

class KanbanService {
  async getAllTasks(includeDeprecated: boolean = false): Promise<KanbanTask[]> {
    const response = await api.get(`/kanban`, {
      params: { deprecated: includeDeprecated }
    });
    return response.data.data.tasks;
  }

  async getTasksByStatus(includeDeprecated: boolean = false): Promise<GroupedTasks> {
    const response = await api.get(`/kanban/grouped`, {
      params: { deprecated: includeDeprecated }
    });
    return response.data.data;
  }

  async getTask(id: string): Promise<KanbanTask> {
    const response = await api.get(`/kanban/${id}`);
    return response.data.data;
  }

  async createTask(data: CreateTaskData): Promise<KanbanTask> {
    const response = await api.post('/kanban', data);
    return response.data.data;
  }

  async updateTask(id: string, data: UpdateTaskData): Promise<KanbanTask> {
    const response = await api.put(`/kanban/${id}`, data);
    return response.data.data;
  }

  async moveTask(id: string, status: KanbanStatus): Promise<KanbanTask> {
    const response = await api.patch(`/kanban/${id}/move`, { status });
    return response.data.data;
  }

  async deleteTask(id: string): Promise<KanbanTask> {
    const response = await api.delete(`/kanban/${id}`);
    return response.data.data;
  }

  async restoreTask(id: string): Promise<KanbanTask> {
    const response = await api.post(`/kanban/${id}/restore`);
    return response.data.data;
  }

  async uploadFiles(id: string, files: File[]): Promise<KanbanTask> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await api.post(`/kanban/${id}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.data;
  }

  async removeFile(id: string, filePath: string): Promise<KanbanTask> {
    const response = await api.delete(`/kanban/${id}/files`, {
      data: { filePath }
    });
    return response.data.data;
  }
}

export const kanbanService = new KanbanService();
