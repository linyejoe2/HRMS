import mongoose, { Document, Schema } from 'mongoose';

export interface ILeaveEntry {
  type: string;
  count: number;
}

export interface ILegacyLeave extends Document {
  empID: string;
  month: string; // format: "2026-05"
  leaves: ILeaveEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const leaveEntrySchema = new Schema<ILeaveEntry>(
  {
    type: { type: String, required: true },
    count: { type: Number, required: true }
  },
  { _id: false }
);

const legacyLeaveSchema = new Schema<ILegacyLeave>(
  {
    empID: { type: String, required: true, index: true },
    month: { type: String, required: true },
    leaves: { type: [leaveEntrySchema], required: true, default: [] }
  },
  { timestamps: true }
);

legacyLeaveSchema.index({ empID: 1, month: 1 }, { unique: true });

export const LegacyLeave = mongoose.model<ILegacyLeave>('LegacyLeave', legacyLeaveSchema);
