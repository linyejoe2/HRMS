import { Schema, model, Document } from 'mongoose';

export interface IVariable extends Document {
  section: string; // Section name (e.g., 'jobType', 'department')
  code: string; // Primary code (e.g., '01', '02')
  code2?: string; // Secondary code (optional)
  description: string; // Human-readable description (e.g., '董事長')
  memo?: string; // Additional notes (optional)
  isActive: boolean; // Enable/disable flag
  createdAt: Date;
  updatedAt: Date;
}

const VariableSchema = new Schema<IVariable>({
  section: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  code2: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  memo: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Compound index for section + code to ensure uniqueness within a section
VariableSchema.index({ section: 1, code: 1 }, { unique: true });

// Index for querying by section
VariableSchema.index({ section: 1, isActive: 1 });

export const Variable = model<IVariable>('Variable', VariableSchema);
