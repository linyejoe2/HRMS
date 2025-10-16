import mongoose, { Document, Schema } from 'mongoose';
import { Counter } from './Counter';

export interface ILeave extends Document {
  sequenceNumber: number;
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
  pastYear: number; // Track leave aging: 0=current, 1=past 1 year, 2=past 2 years, 3=past 3+ years
  createdAt: Date;
  updatedAt: Date;
}

const leaveSchema = new Schema<ILeave>({
  sequenceNumber: {
    type: Number,
    unique: true
  },
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
  },
  pastYear: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Auto-increment sequence number
leaveSchema.pre('save', async function(next) {
  if (this.isNew && !this.sequenceNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'leave_sequence',
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
      );
      this.sequenceNumber = counter.sequence_value;
      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});

export const Leave = mongoose.model<ILeave>('Leave', leaveSchema);