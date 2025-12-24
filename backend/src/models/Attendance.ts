import { Schema, model, Document } from 'mongoose';

/**
 * Attendance model - stores ONLY raw scan data from file scanner
 * All employee info, calculations, and aggregations are done at query time
 */
export interface IAttendance extends Document {
  cardID: string; // 8-digit employee ID from access system
  date: Date; // Attendance date (YYYY-MM-DD)

  // Clock in data
  clockInRawRecord?: string; // Original raw data for debugging
  clockInTime?: Date; // Clock in time
  clockInStatus?: string; // Clock in status (D000=in, D900=out)
  clockInUpdateTime?: Date; // When clock in was last updated

  // Clock out data
  clockOutRawRecord?: string; // Original raw data for debugging
  clockOutTime?: Date; // Clock out time
  clockOutStatus?: string; // Clock out status
  clockOutUpdateTime?: Date; // When clock out was last updated

  // Audit fields
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>({
  cardID: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  clockInRawRecord: {
    type: String
  },
  clockInTime: {
    type: Date
  },
  clockInStatus: {
    type: String
  },
  clockInUpdateTime: {
    type: Date
  },
  clockOutRawRecord: {
    type: String
  },
  clockOutTime: {
    type: Date
  },
  clockOutStatus: {
    type: String
  },
  clockOutUpdateTime: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
AttendanceSchema.index({ cardID: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1 });

export const Attendance = model<IAttendance>('Attendance', AttendanceSchema);