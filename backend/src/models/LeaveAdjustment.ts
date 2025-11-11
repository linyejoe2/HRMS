import mongoose, { Document, Schema } from 'mongoose';

export interface ILeaveAdjustment extends Document {
  empID: string;
  name: string;
  department: string;
  leaveType: string;
  minutes: number; // Can be negative to increase remaining leave, or positive to decrease
  reason: string;
  createdBy: string; // empID of the user who created this adjustment
  createdAt: Date;
  updatedAt: Date;
}

const leaveAdjustmentSchema = new Schema<ILeaveAdjustment>({
  empID: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  leaveType: {
    type: String,
    required: true,
    enum: ['事假', '普通傷病假', '特別休假'],
    index: true
  },
  minutes: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
leaveAdjustmentSchema.index({ empID: 1, leaveType: 1 });

export const LeaveAdjustment = mongoose.model<ILeaveAdjustment>('LeaveAdjustment', leaveAdjustmentSchema);
