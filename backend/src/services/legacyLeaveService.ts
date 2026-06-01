import { LegacyLeave, ILegacyLeave, ILeaveEntry } from '../models';
import { APIError } from '../middleware/errorHandler';

export class LegacyLeaveService {
  static async getByEmpID(empID: string): Promise<ILegacyLeave[]> {
    return LegacyLeave.find({ empID }).sort({ month: -1 });
  }

  static async upsertByMonth(
    empID: string,
    month: string,
    leaves: ILeaveEntry[]
  ): Promise<ILegacyLeave> {
    const existing = await LegacyLeave.findOne({ empID, month });

    if (!existing) {
      return LegacyLeave.create({ empID, month, leaves });
    }

    // Merge: update matching types, append new ones
    const merged = [...existing.leaves] as ILeaveEntry[];
    for (const entry of leaves) {
      const idx = merged.findIndex(l => l.type === entry.type);
      if (idx >= 0) {
        merged[idx] = entry;
      } else {
        merged.push(entry);
      }
    }

    existing.leaves = merged;
    await existing.save();
    return existing;
  }

  static async deleteByMonth(empID: string, month: string): Promise<void> {
    const result = await LegacyLeave.findOneAndDelete({ empID, month });
    if (!result) {
      throw new APIError('找不到該歷史假別紀錄', 404);
    }
  }
}
