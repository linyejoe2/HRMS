import mongoose, { Document, Schema } from 'mongoose';

export interface ILeave extends Document {
  empID: string;
  name: string;
  department: string;
  leaveType: string;
  reason: string;
  leaveStart: Date;
  leaveEnd: Date;
  YY: string;
  mm: string;
  DD: string;
  hour: string;
  minutes: string;
  status: 'created' | 'approved' | 'rejected' | 'cancel';
  rejectionReason?: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const leaveSchema = new Schema<ILeave>({
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
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  leaveStart: {
    type: Date,
    required: true
  },
  leaveEnd: {
    type: Date,
    required: true
  },
  YY: {
    type: String,
    required: true
  },
  mm: {
    type: String,
    required: true
  },
  DD: {
    type: String,
    required: true
  },
  hour: {
    type: String,
    required: true
  },
  minutes: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['created', 'approved', 'rejected', 'cancel'],
    default: 'created',
    index: true
  },
  rejectionReason: {
    type: String
  },
  approvedBy: {
    type: String
  }
}, {
  timestamps: true
});

export const Leave = mongoose.model<ILeave>('Leave', leaveSchema);