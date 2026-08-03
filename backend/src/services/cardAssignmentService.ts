import { Types } from 'mongoose';
import { CardAssignment, ICardAssignment } from '../models/CardAssignment';

export class CardAssignmentService {
  /**
   * Assign a card to an employee.
   * Revokes any current active assignment for that employee, then creates a new one.
   */
  async assignCard(employeeId: string | Types.ObjectId, empID: string, cardID: string): Promise<ICardAssignment> {
    const now = new Date();

    // Revoke current active assignment for this employee (if any)
    await CardAssignment.updateMany(
      { employeeId, revokedAt: null },
      { $set: { revokedAt: now } }
    );

    // Also revoke any active assignment for this cardID held by another employee
    await CardAssignment.updateMany(
      { cardID, revokedAt: null },
      { $set: { revokedAt: now } }
    );

    // Create new assignment
    const assignment = new CardAssignment({
      employeeId,
      empID,
      cardID,
      assignedAt: now,
      revokedAt: null
    });

    return assignment.save();
  }

  /**
   * Get the current active assignment for a given cardID.
   */
  async getActiveAssignment(cardID: string): Promise<ICardAssignment | null> {
    return CardAssignment.findOne({ cardID, revokedAt: null });
  }

  /**
   * Get who owned a card at a specific date.
   * Finds assignment where assignedAt <= date AND (revokedAt is null OR revokedAt > date).
   */
  async getAssignmentAtDate(cardID: string, date: Date): Promise<ICardAssignment | null> {
    return CardAssignment.findOne({
      cardID,
      assignedAt: { $lte: date },
      $or: [
        { revokedAt: null },
        { revokedAt: { $gt: date } }
      ]
    });
  }

  /**
   * Revoke the active card assignment for an employee.
   */
  async revokeCard(employeeId: string | Types.ObjectId): Promise<void> {
    await CardAssignment.updateMany(
      { employeeId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }
}

export const cardAssignmentService = new CardAssignmentService();
