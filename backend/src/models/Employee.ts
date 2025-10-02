import { Schema, model, Document } from 'mongoose';

export interface IEmployee extends Document {
  name: string;
  empID: string; // Employee ID
  empID2: string; // Original ID from Access DB
  password?: string; // Hashed password for new system
  isActive: boolean;
  role: 'admin' | 'hr' | 'employee' | 'manager';
  lastLogin?: Date;
  department?: string;
  hireDate?: Date; // 入職日期
  salary?: number; // 薪水

  // Audit fields
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  empID: {
    type: String,
    required: true,
    unique: true
  },
  empID2: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    select: false // Don't include password in queries by default
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['admin', 'hr', 'employee', 'manager'],
    default: 'employee'
  },
  lastLogin: {
    type: Date
  },
  department: {
    type: String,
    trim: true
  },
  hireDate: {
    type: Date
  },
  salary: {
    type: Number,
    select: false // Don't include salary in queries by default for security
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for performance
EmployeeSchema.index({ empID: 1 });
EmployeeSchema.index({ empID2: 1 });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ isActive: 1 });

export const Employee = model<IEmployee>('Employee', EmployeeSchema);