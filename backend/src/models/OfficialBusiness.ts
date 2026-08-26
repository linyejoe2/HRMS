import mongoose, { Document, Schema } from 'mongoose';
import { Counter } from './Counter';

export interface IOfficialBusiness extends Document {
  sequenceNumber: number;
  applicant: string;
  applicantName: string;
  empIDs: string[];
  participantNames: string[];
  licensePlate: string;
  startTime: Date;
  endTime?: Date;
  purpose: string;
  supportingInfo?: string[];
  status: 'created' | 'approved' | 'rejected' | 'cancel';
  rejectionReason?: string;
  approvedBy?: string;
  department: string;
  manager?: string;
  managerApproveStatus: 'pending' | 'approved' | 'rejected';
  managerMemo?: string;
  managerApproveAt?: Date;
  agent?: string; // empID of the HR/admin who created+approved this request on the employee's behalf
  createdAt: Date;
  updatedAt: Date;
}

const officialBusinessSchema = new Schema<IOfficialBusiness>({
  sequenceNumber: {
    type: Number,
    unique: true
  },
  applicant: {
    type: String,
    required: true,
    index: true
  },
  applicantName: {
    type: String,
    required: true
  },
  empIDs: {
    type: [String],
    required: true,
    index: true
  },
  participantNames: {
    type: [String],
    required: true
  },
  licensePlate: {
    type: String
  },
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date
  },
  purpose: {
    type: String,
    required: true
  },
  supportingInfo: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['created', 'approved', 'rejected', 'cancel'],
    default: 'created',
    required: true,
    index: true
  },
  rejectionReason: {
    type: String
  },
  approvedBy: {
    type: String
  },
  department: {
    type: String,
    index: true
  },
  manager: {
    type: String
  },
  managerApproveStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  managerMemo: {
    type: String
  },
  managerApproveAt: {
    type: Date
  },
  agent: {
    type: String
  }
}, {
  timestamps: true
});

// Auto-increment sequenceNumber using Counter
officialBusinessSchema.pre('save', async function(next) {
  if (this.isNew && !this.sequenceNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'officialbusiness_sequence',
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
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

export const OfficialBusiness = mongoose.model<IOfficialBusiness>('OfficialBusiness', officialBusinessSchema);
