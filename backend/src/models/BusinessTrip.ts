import mongoose, { Document, Schema } from 'mongoose';
import { Counter } from './Counter';

export interface IBusinessTrip extends Document {
  sequenceNumber: number;
  empID: string;
  name: string;
  department: string;
  destination: string; // Destination location
  purpose: string; // Purpose of the trip
  tripStart: Date; // Start date and time
  tripEnd: Date; // End date and time
  transportation?: string; // Mode of transportation
  estimatedCost?: number; // Estimated cost
  notes?: string; // Additional notes
  supportingInfo?: string[]; // Array of file paths or URLs to supporting documents (相關資料)
  status: 'created' | 'approved' | 'rejected' | 'cancel';
  rejectionReason?: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const businessTripSchema = new Schema<IBusinessTrip>({
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
  destination: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    required: true
  },
  tripStart: {
    type: Date,
    required: true,
    index: true
  },
  tripEnd: {
    type: Date,
    required: true
  },
  transportation: {
    type: String
  },
  estimatedCost: {
    type: Number
  },
  notes: {
    type: String
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
businessTripSchema.pre('save', async function(next) {
  if (this.isNew && !this.sequenceNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'businesstrip_sequence',
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

export const BusinessTrip = mongoose.model<IBusinessTrip>('BusinessTrip', businessTripSchema);
