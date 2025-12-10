import { KanbanTask, IKanbanTask, KanbanStatus } from '../models';
import { APIError } from '../middleware';

export class KanbanService {
  /**
   * Get all tasks (excluding deprecated by default)
   */
  async getAllTasks(includeDeprecated: boolean = false): Promise<IKanbanTask[]> {
    const query = includeDeprecated ? {} : { deprecated: false };
    return KanbanTask.find(query).sort({ createdAt: -1 });
  }

  /**
   * Get tasks grouped by status
   */
  async getTasksByStatus(includeDeprecated: boolean = false): Promise<{
    [key in KanbanStatus | 'Deprecated']?: IKanbanTask[]
  }> {
    const tasks = await this.getAllTasks(includeDeprecated);

    const grouped: { [key in KanbanStatus | 'Deprecated']?: IKanbanTask[] } = {
      'Backlog': [],
      'To Do': [],
      'In Progress': [],
      'Testing': [],
      'Done': []
    };

    if (includeDeprecated) {
      grouped['Deprecated'] = [];
    }

    tasks.forEach(task => {
      if (task.deprecated && includeDeprecated) {
        grouped['Deprecated']!.push(task);
      } else if (!task.deprecated) {
        if (!grouped[task.status]) {
          grouped[task.status] = [];
        }
        grouped[task.status]!.push(task);
      }
    });

    return grouped;
  }

  /**
   * Get a single task by ID
   */
  async getTaskById(taskId: string): Promise<IKanbanTask> {
    const task = await KanbanTask.findById(taskId);

    if (!task) {
      throw new APIError('Task not found', 404);
    }

    return task;
  }

  /**
   * Create a new task
   */
  async createTask(data: {
    title: string;
    content?: string;
    files?: string[];
    author: string;
    authorName: string;
    executor?: string;
    executorName?: string;
    status?: KanbanStatus;
  }): Promise<IKanbanTask> {
    const task = new KanbanTask({
      title: data.title,
      content: data.content || '',
      files: data.files || [],
      author: data.author,
      authorName: data.authorName,
      executor: data.executor,
      executorName: data.executorName,
      status: data.status || 'Backlog',
      deprecated: false,
      history: [{
        action: 'created',
        performedBy: data.author,
        performedByName: data.authorName,
        timestamp: new Date(),
        details: `Task created with status: ${data.status || 'Backlog'}`
      }]
    });

    await task.save();
    return task;
  }

  /**
   * Update a task
   */
  async updateTask(
    taskId: string,
    data: {
      title?: string;
      content?: string;
      files?: string[];
      executor?: string;
      executorName?: string;
      status?: KanbanStatus;
    },
    performedBy: string,
    performedByName: string
  ): Promise<IKanbanTask> {
    const task = await this.getTaskById(taskId);

    if (task.deprecated) {
      throw new APIError('Cannot update a deprecated task', 400);
    }

    const changes: string[] = [];

    // Track changes
    if (data.title !== undefined && data.title !== task.title) {
      changes.push(`Title: "${task.title}" → "${data.title}"`);
      task.title = data.title;
    }

    if (data.content !== undefined && data.content !== task.content) {
      changes.push(`Content updated`);
      task.content = data.content;
    }

    if (data.files !== undefined) {
      changes.push(`Files updated`);
      task.files = data.files;
    }

    if (data.executor !== undefined && data.executor !== task.executor) {
      changes.push(`Executor: ${task.executorName || 'None'} → ${data.executorName || 'None'}`);
      task.executor = data.executor;
      task.executorName = data.executorName;
    }

    if (data.status !== undefined && data.status !== task.status) {
      const fromStatus = task.status;
      const toStatus = data.status;

      task.history.push({
        action: 'moved',
        performedBy,
        performedByName,
        timestamp: new Date(),
        details: `Moved from "${fromStatus}" to "${toStatus}"`,
        fromStatus,
        toStatus
      });

      task.status = data.status;
    }

    // Add modification history if there are changes
    if (changes.length > 0) {
      task.history.push({
        action: 'modified',
        performedBy,
        performedByName,
        timestamp: new Date(),
        details: changes.join('; ')
      });
    }

    await task.save();
    return task;
  }

  /**
   * Move a task to a different status
   */
  async moveTask(
    taskId: string,
    newStatus: KanbanStatus,
    performedBy: string,
    performedByName: string
  ): Promise<IKanbanTask> {
    return this.updateTask(taskId, { status: newStatus }, performedBy, performedByName);
  }

  /**
   * Soft delete a task (mark as deprecated)
   */
  async deleteTask(
    taskId: string,
    performedBy: string,
    performedByName: string
  ): Promise<IKanbanTask> {
    const task = await this.getTaskById(taskId);

    if (task.deprecated) {
      throw new APIError('Task is already deleted', 400);
    }

    task.deprecated = true;
    task.history.push({
      action: 'deleted',
      performedBy,
      performedByName,
      timestamp: new Date(),
      details: 'Task marked as deprecated'
    });

    await task.save();
    return task;
  }

  /**
   * Restore a deprecated task
   */
  async restoreTask(
    taskId: string,
    performedBy: string,
    performedByName: string
  ): Promise<IKanbanTask> {
    const task = await this.getTaskById(taskId);

    if (!task.deprecated) {
      throw new APIError('Task is not deleted', 400);
    }

    task.deprecated = false;
    task.history.push({
      action: 'restored',
      performedBy,
      performedByName,
      timestamp: new Date(),
      details: 'Task restored from deprecated'
    });

    await task.save();
    return task;
  }

  /**
   * Permanently delete a task (use with caution)
   */
  async permanentlyDeleteTask(taskId: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    await KanbanTask.deleteOne({ _id: task._id });
  }

  /**
   * Add a file to a task
   */
  async addFile(
    taskId: string,
    filePath: string,
    performedBy: string,
    performedByName: string
  ): Promise<IKanbanTask> {
    const task = await this.getTaskById(taskId);

    if (task.deprecated) {
      throw new APIError('Cannot add files to a deprecated task', 400);
    }

    task.files.push(filePath);
    task.history.push({
      action: 'modified',
      performedBy,
      performedByName,
      timestamp: new Date(),
      details: `File added: ${filePath.split('/').pop()}`
    });

    await task.save();
    return task;
  }

  /**
   * Remove a file from a task
   */
  async removeFile(
    taskId: string,
    filePath: string,
    performedBy: string,
    performedByName: string
  ): Promise<IKanbanTask> {
    const task = await this.getTaskById(taskId);

    if (task.deprecated) {
      throw new APIError('Cannot remove files from a deprecated task', 400);
    }

    task.files = task.files.filter(f => f !== filePath);
    task.history.push({
      action: 'modified',
      performedBy,
      performedByName,
      timestamp: new Date(),
      details: `File removed: ${filePath.split('/').pop()}`
    });

    await task.save();
    return task;
  }
}

export const kanbanService = new KanbanService();
