import { Schema, model, Document } from 'mongoose';

export interface IAttendance extends Document {
  empID2: string; // 8-digit employee ID from access system
  empID?: string; // Mapped employee ID (A029, etc.)
  employeeName?: string; // Employee name from Employee collection
  department?: string; // Department from Employee collection
  date: Date; // Attendance date (YYYY-MM-DD)
  clockInTime?: Date; // Clock in time
  clockInStatus?: string; // Clock in status (D000=in, D900=out)
  clockOutTime?: Date; // Clock out time  
  clockOutStatus?: string; // Clock out status
  rawRecord: string; // Original raw data for debugging
  
  // Calculated fields
  workHours?: number; // Total work hours
  isLate?: boolean; // Is late for work
  isAbsent?: boolean; // Is absent
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>({
  empID2: {
    type: String,
    required: true,
    index: true
  },
  empID: {
    type: String,
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
  clockInTime: {
    type: Date
  },
  clockInStatus: {
    type: String
  },
  clockOutTime: {
    type: Date
  },
  clockOutStatus: {
    type: String
  },
  rawRecord: {
    type: String,
    required: true
  },
  workHours: {
    type: Number
  },
  isLate: {
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

// Compound indexes for efficient queries
AttendanceSchema.index({ empID2: 1, date: 1 });
AttendanceSchema.index({ empID: 1, date: 1 });
AttendanceSchema.index({ date: 1, empID2: 1 });

export const Attendance = model<IAttendance>('Attendance', AttendanceSchema);