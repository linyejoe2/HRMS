import { Schema, model, Document } from 'mongoose';

export type KanbanStatus = 'Backlog' | 'To Do' | 'In Progress' | 'Testing' | 'Done';

export interface IKanbanHistoryEntry {
  action: 'created' | 'moved' | 'modified' | 'deleted' | 'restored';
  performedBy: string; // empID
  performedByName: string; // employee name
  timestamp: Date;
  details?: string; // e.g., "Moved from 'To Do' to 'In Progress'" or "Modified: title changed"
  fromStatus?: KanbanStatus;
  toStatus?: KanbanStatus;
}

export interface IKanbanTask extends Document {
  title: string;
  content: string;
  files: string[]; // Array of file paths/URLs
  author: string; // empID of creator
  authorName: string; // name of creator
  executor?: string; // empID of assigned person
  executorName?: string; // name of assigned person
  status: KanbanStatus;
  deprecated: boolean;
  history: IKanbanHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const KanbanHistoryEntrySchema = new Schema<IKanbanHistoryEntry>({
  action: {
    type: String,
    enum: ['created', 'moved', 'modified', 'deleted', 'restored'],
    required: true
  },
  performedBy: {
    type: String,
    required: true
  },
  performedByName: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  details: {
    type: String
  },
  fromStatus: {
    type: String,
    enum: ['Backlog', 'To Do', 'In Progress', 'Testing', 'Done']
  },
  toStatus: {
    type: String,
    enum: ['Backlog', 'To Do', 'In Progress', 'Testing', 'Done']
  }
}, { _id: false });

const KanbanTaskSchema = new Schema<IKanbanTask>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  files: {
    type: [String],
    default: []
  },
  author: {
    type: String,
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  executor: {
    type: String
  },
  executorName: {
    type: String
  },
  status: {
    type: String,
    enum: ['Backlog', 'To Do', 'In Progress', 'Testing', 'Done'],
    default: 'Backlog'
  },
  deprecated: {
    type: Boolean,
    default: false
  },
  history: {
    type: [KanbanHistoryEntrySchema],
    default: []
  }
}, {
  timestamps: true
});

// Index for faster queries
KanbanTaskSchema.index({ deprecated: 1, status: 1 });
KanbanTaskSchema.index({ author: 1 });
KanbanTaskSchema.index({ executor: 1 });

export const KanbanTask = model<IKanbanTask>('KanbanTask', KanbanTaskSchema);
