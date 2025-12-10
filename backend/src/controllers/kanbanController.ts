import { Request, Response } from 'express';
import { kanbanService } from '../services';
import { asyncHandler, AuthRequest } from '../middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'kanban');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, Word, Excel, and text files are allowed.'));
    }
  }
});

export class KanbanController {
  // File upload middleware
  uploadFiles = upload.array('files', 5); // Max 5 files per upload

  // Get all tasks
  getAllTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
    const includeDeprecated = req.query.deprecated === 'true';
    const tasks = await kanbanService.getAllTasks(includeDeprecated);

    res.status(200).json({
      error: false,
      message: '成功取得所有任務',
      data: {
        count: tasks.length,
        tasks
      }
    });
  });

  // Get tasks grouped by status
  getTasksByStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const includeDeprecated = req.query.deprecated === 'true';
    const groupedTasks = await kanbanService.getTasksByStatus(includeDeprecated);

    res.status(200).json({
      error: false,
      message: '成功取得任務狀態分組',
      data: groupedTasks
    });
  });

  // Get a single task
  getTask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const task = await kanbanService.getTaskById(id);

    res.status(200).json({
      error: false,
      message: '成功取得任務',
      data: task
    });
  });

  // Create a new task
  createTask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: true,
        message: '找不到使用者資訊'
      });
      return;
    }

    const { title, content, executor, executorName, status } = req.body;

    if (!title) {
      res.status(400).json({
        error: true,
        message: '標題為必填'
      });
      return;
    }

    const task = await kanbanService.createTask({
      title,
      content,
      author: user.empID,
      authorName: user.name || user.empID,
      executor,
      executorName,
      status
    });

    res.status(201).json({
      error: false,
      message: '任務建立成功',
      data: task
    });
  });

  // Update a task
  updateTask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: true,
        message: '找不到使用者資訊'
      });
      return;
    }

    const { id } = req.params;
    const { title, content, executor, executorName, status } = req.body;

    const task = await kanbanService.updateTask(
      id,
      { title, content, executor, executorName, status },
      user.empID,
      user.name || user.empID
    );

    res.status(200).json({
      error: false,
      message: '任務更新成功',
      data: task
    });
  });

  // Move a task to different status
  moveTask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: true,
        message: '找不到使用者資訊'
      });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        error: true,
        message: '狀態為必填'
      });
      return;
    }

    const task = await kanbanService.moveTask(
      id,
      status,
      user.empID,
      user.name || user.empID
    );

    res.status(200).json({
      error: false,
      message: '任務移動成功',
      data: task
    });
  });

  // Delete a task (soft delete)
  deleteTask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: true,
        message: '找不到使用者資訊'
      });
      return;
    }

    const { id } = req.params;

    const task = await kanbanService.deleteTask(
      id,
      user.empID,
      user.name || user.empID
    );

    res.status(200).json({
      error: false,
      message: '任務刪除成功',
      data: task
    });
  });

  // Restore a deleted task
  restoreTask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: true,
        message: '找不到使用者資訊'
      });
      return;
    }

    const { id } = req.params;

    const task = await kanbanService.restoreTask(
      id,
      user.empID,
      user.name || user.empID
    );

    res.status(200).json({
      error: false,
      message: '任務復原成功',
      data: task
    });
  });

  // Upload files to a task
  uploadTaskFiles = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: true,
        message: '找不到使用者資訊'
      });
      return;
    }

    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        error: true,
        message: '沒有上傳檔案'
      });
      return;
    }

    let task = await kanbanService.getTaskById(id);

    for (const file of files) {
      const relativePath = `/uploads/kanban/${file.filename}`;
      task = await kanbanService.addFile(
        id,
        relativePath,
        user.empID,
        user.name || user.empID
      );
    }

    res.status(200).json({
      error: false,
      message: '檔案上傳成功',
      data: task
    });
  });

  // Remove a file from a task
  removeTaskFile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: true,
        message: '找不到使用者資訊'
      });
      return;
    }

    const { id } = req.params;
    const { filePath } = req.body;

    if (!filePath) {
      res.status(400).json({
        error: true,
        message: '檔案路徑為必填'
      });
      return;
    }

    const task = await kanbanService.removeFile(
      id,
      filePath,
      user.empID,
      user.name || user.empID
    );

    // Delete the physical file
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    res.status(200).json({
      error: false,
      message: '檔案刪除成功',
      data: task
    });
  });
}

export const kanbanController = new KanbanController();
