import { Schema, model, Document } from 'mongoose';

export interface IAttendanceFile extends Document {
  name: string;
  updateDate: string;
  fileSize: string;
  lastProcessed?: Date;
  processedRecords?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceFileSchema = new Schema<IAttendanceFile>({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  updateDate: {
    type: String,
    required: true
  },
  fileSize: {
    type: String,
    required: true
  },
  lastProcessed: {
    type: Date
  },
  processedRecords: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export const AttendanceFile = model<IAttendanceFile>('AttendanceFile', AttendanceFileSchema);