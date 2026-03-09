import { Schema, model, Document, Types } from 'mongoose';

export interface ICardAssignment extends Document {
  employeeId: Types.ObjectId;
  empID: string;
  cardID: string;
  assignedAt: Date;
  revokedAt?: Date | null;
}

const CardAssignmentSchema = new Schema<ICardAssignment>({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  empID: {
    type: String,
    required: true
  },
  cardID: {
    type: String,
    required: true
  },
  assignedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  revokedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Find active card assignment
CardAssignmentSchema.index({ cardID: 1, revokedAt: 1 });
// Find assignments by employee
CardAssignmentSchema.index({ employeeId: 1 });
// Historical lookup: who owned a card at a specific date
CardAssignmentSchema.index({ cardID: 1, assignedAt: 1, revokedAt: 1 });

export const CardAssignment = model<ICardAssignment>('CardAssignment', CardAssignmentSchema);
