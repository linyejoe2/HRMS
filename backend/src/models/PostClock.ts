import mongoose, { Document, Schema } from 'mongoose';
import { Counter } from './Counter';

export interface IPostClock extends Document {
  sequenceNumber: number;
  empID: string;
  name: string;
  department: string;
  date: Date; // The date for the clock correction
  time: Date; // The time to be recorded
  clockType: 'in' | 'out'; // Clock in or out
  reason: string;
  supportingInfo?: string[]; // Array of file paths or URLs to supporting documents
  status: 'created' | 'approved' | 'rejected' | 'cancel';
  rejectionReason?: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const postClockSchema = new Schema<IPostClock>({
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
  date: {
    type: Date,
    required: true,
    index: true
  },
  time: {
    type: Date,
    required: true
  },
  clockType: {
    type: String,
    enum: ['in', 'out'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  supportingInfo: {
    type: [String]
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

// Auto-increment sequence number
postClockSchema.pre('save', async function(next) {
  if (this.isNew && !this.sequenceNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'postclock_sequence',
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

export const PostClock = mongoose.model<IPostClock>('PostClock', postClockSchema);
