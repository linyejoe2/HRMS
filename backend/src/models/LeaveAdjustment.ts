import mongoose, { Document, Schema } from 'mongoose';

export interface ILeaveAdjustment extends Document {
  empID: string;
  name: string;
  department: string;
  leaveType: string;
  minutes: number; // Can be negative to increase remaining leave, or positive to decrease
  reason: string;
  effectiveDate: Date;
  expiryDate?: Date; // Optional: adjustment becomes invalid after this date
  createdBy: string; // empID of the user who created this adjustment
  createdByDesc: string;
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
    enum: ['事假', '普通傷病假', '特別休假', '婚假', '喪假',
      '生理假',
      // '普通傷病假(住院)',
      '公傷病假',
      '公假',
      '產假',
      '產檢假',
      '陪產檢及陪產假',
      // '家庭照顧假',
      '安胎休養請假',
      '育嬰留職停薪'],
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
  effectiveDate: {
    type: Date,
    required: true,
    index: true
  },
  expiryDate: {
    type: Date,
    required: false,
    index: true
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
