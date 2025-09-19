import { Schema, model, Document } from 'mongoose';

export interface IAttendance extends Document {
  empID: string; // Mapped employee ID (A029, etc.)
  empID2?: string; // 8-digit employee ID from access system
  employeeName?: string; // Employee name from Employee collection
  department?: string; // Department from Employee collection
  date: Date; // Attendance date (YYYY-MM-DD)
  clockInRawRecord?: string; // Original raw data for debugging
  clockInTime?: Date; // Clock in time
  clockInStatus?: string; // Clock in status (D000=in, D900=out)
  clockOutRawRecord?: string; // Original raw data for debugging
  clockOutTime?: Date; // Clock out time  
  clockOutStatus?: string; // Clock out status
  
  // Calculated fields
  workDuration?: number; // Total work hours
  isLate?: boolean; // Is late for work
  isEarlyLeave?: boolean;
  isAbsent?: boolean; // Is absent
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>({
  empID2: {
    type: String,
    index: true
  },
  empID: {
    type: String,
    required: true,
    index: true
  },
  employeeName: {
    type: String
  },
  department: {
    type: String
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
  clockOutRawRecord: {
    type: String
  },
  clockOutTime: {
    type: Date
  },
  clockOutStatus: {
    type: String,
  },
  workDuration: {
    type: Number
  },
  isLate: {
    type: Boolean,
    default: false
  },
  isEarlyLeave: {
    type: Boolean,
    default: false
  },
  isAbsent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export const Attendance = model<IAttendance>('Attendance', AttendanceSchema);