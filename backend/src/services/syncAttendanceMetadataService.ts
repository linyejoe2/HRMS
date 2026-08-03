import { Attendance } from '../models/Attendance';
import { Employee } from '../models/Employee';
import { CardAssignment } from '../models/CardAssignment';

interface SyncOptions {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
}

/**
 * Backfill empID and employeeName on historical Attendance records
 * using CardAssignment history and Employee data.
 */
export async function syncAttendanceMetadata(options: SyncOptions = {}): Promise<{
  total: number;
  updated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updated = 0;

  // Build query filter
  const query: any = {};

  if (options.startDate || options.endDate) {
    query.date = {};
    if (options.startDate) query.date.$gte = new Date(options.startDate);
    if (options.endDate) query.date.$lte = new Date(options.endDate + 'T23:59:59.999Z');
  }

  if (options.employeeId) {
    // Find all cardIDs this employee has ever used
    const assignments = await CardAssignment.find({ employeeId: options.employeeId });
    const cardIDs = assignments.map(a => a.cardID);
    // Also check the employee's current cardID
    const emp = await Employee.findById(options.employeeId);
    if (emp?.cardID && !cardIDs.includes(emp.cardID)) {
      cardIDs.push(emp.cardID);
    }
    if (cardIDs.length > 0) {
      query.cardID = { $in: cardIDs };
    } else {
      return { total: 0, updated: 0, errors: ['No card assignments found for this employee'] };
    }
  }

  const records = await Attendance.find(query);
  const total = records.length;

  // Cache employee lookups
  const employeeCache = new Map<string, { empID: string; name: string } | null>();

  for (const record of records) {
    try {
      // Try CardAssignment first (historical lookup by date)
      const assignment = await CardAssignment.findOne({
        cardID: record.cardID,
        assignedAt: { $lte: record.date },
        $or: [
          { revokedAt: null },
          { revokedAt: { $gt: record.date } }
        ]
      });

      let empID: string | undefined;
      let employeeName: string | undefined;

      if (assignment) {
        const cacheKey = assignment.employeeId.toString();
        if (!employeeCache.has(cacheKey)) {
          const emp = await Employee.findById(assignment.employeeId);
          employeeCache.set(cacheKey, emp ? { empID: emp.empID, name: emp.name } : null);
        }
        const cached = employeeCache.get(cacheKey);
        if (cached) {
          empID = cached.empID;
          employeeName = cached.name;
        }
      } else {
        // Fallback: lookup employee by cardID directly
        const cacheKey = `card:${record.cardID}`;
        if (!employeeCache.has(cacheKey)) {
          const emp = await Employee.findOne({ cardID: record.cardID });
          employeeCache.set(cacheKey, emp ? { empID: emp.empID, name: emp.name } : null);
        }
        const cached = employeeCache.get(cacheKey);
        if (cached) {
          empID = cached.empID;
          employeeName = cached.name;
        }
      }

      // Update if we found data and it differs from current
      if (empID && (record.empID !== empID || record.employeeName !== employeeName)) {
        record.empID = empID;
        record.employeeName = employeeName;
        await record.save();
        updated++;
      }
    } catch (error) {
      errors.push(`Error syncing record ${record._id} (cardID: ${record.cardID}): ${error}`);
    }
  }

  return { total, updated, errors };
}
