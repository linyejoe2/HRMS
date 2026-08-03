import { LeaveService } from './leaveService';
import { Leave, ILeave } from '../models';
import mongoose from 'mongoose';

jest.mock('../models', () => ({
  Leave: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    prototype: {
      save: jest.fn(),
    }
  },
  Employee: {
    findOne: jest.fn(),
  }
}));

describe('LeaveService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkLeaveRequestDidntRepeat', () => {
    const mockObjectId = new mongoose.Types.ObjectId();

    test('should return true when no approved leaves exist', async () => {
      const mockLeave = {
        _id: mockObjectId,
        empID: 'EMP001',
        leaveStart: new Date('2025-10-01T01:00:00.000Z'),
        leaveEnd: new Date('2025-10-01T05:00:00.000Z'),
        status: 'created'
      } as ILeave;

      (Leave.find as jest.Mock).mockResolvedValue([]);

      const result = await LeaveService.checkLeaveRequestDidntRepeat(mockLeave);

      expect(result).toBe(true);
      expect(Leave.find).toHaveBeenCalledWith({ empID: 'EMP001' });
    });

    test('should return true when no overlapping approved leaves exist', async () => {
      const mockLeave = {
        _id: mockObjectId,
        empID: 'EMP001',
        leaveStart: new Date('2025-10-01T01:00:00.000Z'), // 09:00 Taipei
        leaveEnd: new Date('2025-10-01T05:00:00.000Z'),   // 13:00 Taipei
        status: 'created'
      } as ILeave;

      const existingLeaves = [
        {
          _id: new mongoose.Types.ObjectId(),
          empID: 'EMP001',
          leaveStart: new Date('2025-09-30T01:00:00.000Z'), // Previous day
          leaveEnd: new Date('2025-09-30T05:00:00.000Z'),
          status: 'approved'
        },
        {
          _id: new mongoose.Types.ObjectId(),
          empID: 'EMP001',
          leaveStart: new Date('2025-10-02T01:00:00.000Z'), // Next day
          leaveEnd: new Date('2025-10-02T05:00:00.000Z'),
          status: 'approved'
        }
      ];

      (Leave.find as jest.Mock).mockResolvedValue(existingLeaves);

      const result = await LeaveService.checkLeaveRequestDidntRepeat(mockLeave);

      expect(result).toBe(true);
    });

    test('should return false when overlapping approved leave exists', async () => {
      const mockLeave = {
        _id: mockObjectId,
        empID: 'EMP001',
        leaveStart: new Date('2025-10-01T01:00:00.000Z'), // 09:00 Taipei
        leaveEnd: new Date('2025-10-01T05:00:00.000Z'),   // 13:00 Taipei
        status: 'created'
      } as ILeave;

      const existingLeaves = [
        {
          _id: new mongoose.Types.ObjectId(),
          empID: 'EMP001',
          leaveStart: new Date('2025-10-01T03:00:00.000Z'), // 11:00 Taipei - overlaps
          leaveEnd: new Date('2025-10-01T07:00:00.000Z'),   // 15:00 Taipei
          status: 'approved'
        }
      ];

      (Leave.find as jest.Mock).mockResolvedValue(existingLeaves);

      const result = await LeaveService.checkLeaveRequestDidntRepeat(mockLeave);

      expect(result).toBe(false);
    });

    test('should return true when checking same leave request (update scenario)', async () => {
      const sameId = new mongoose.Types.ObjectId();
      const mockLeave = {
        _id: sameId,
        empID: 'EMP001',
        leaveStart: new Date('2025-10-01T01:00:00.000Z'),
        leaveEnd: new Date('2025-10-01T05:00:00.000Z'),
        status: 'created'
      } as ILeave;

      const existingLeaves = [
        {
          _id: sameId, // Same ID as the leave being checked
          empID: 'EMP001',
          leaveStart: new Date('2025-10-01T01:00:00.000Z'),
          leaveEnd: new Date('2025-10-01T05:00:00.000Z'),
          status: 'approved'
        }
      ];

      (Leave.find as jest.Mock).mockResolvedValue(existingLeaves);

      const result = await LeaveService.checkLeaveRequestDidntRepeat(mockLeave);

      expect(result).toBe(true);
    });

    test('should return false for exact time overlap', async () => {
      const mockLeave = {
        _id: mockObjectId,
        empID: 'EMP001',
        leaveStart: new Date('2025-10-01T01:00:00.000Z'),
        leaveEnd: new Date('2025-10-01T05:00:00.000Z'),
        status: 'created'
      } as ILeave;

      const existingLeaves = [
        {
          _id: new mongoose.Types.ObjectId(),
          empID: 'EMP001',
          leaveStart: new Date('2025-10-01T01:00:00.000Z'), // Exact same time
          leaveEnd: new Date('2025-10-01T05:00:00.000Z'),
          status: 'approved'
        }
      ];

      (Leave.find as jest.Mock).mockResolvedValue(existingLeaves);

      const result = await LeaveService.checkLeaveRequestDidntRepeat(mockLeave);

      expect(result).toBe(false);
    });

    test('should return false for partial overlap at start', async () => {
      const mockLeave = {
        _id: mockObjectId,
        empID: 'EMP001',
        leaveStart: new Date('2025-10-01T01:00:00.000Z'), // 09:00
        leaveEnd: new Date('2025-10-01T05:00:00.000Z'),   // 13:00
        status: 'created'
      } as ILeave;

      const existingLeaves = [
        {
          _id: new mongoose.Types.ObjectId(),
          empID: 'EMP001',
          leaveStart: new Date('2025-09-30T22:00:00.000Z'), // Previous day 06:00 next day
          leaveEnd: new Date('2025-10-01T03:00:00.000Z'),   // 11:00 - overlaps at start
          status: 'approved'
        }
      ];

      (Leave.find as jest.Mock).mockResolvedValue(existingLeaves);

      const result = await LeaveService.checkLeaveRequestDidntRepeat(mockLeave);

      expect(result).toBe(false);
    });

    test('should return false for partial overlap at end', async () => {
      const mockLeave = {
        _id: mockObjectId,
        empID: 'EMP001',
        leaveStart: new Date('2025-10-01T01:00:00.000Z'), // 09:00
        leaveEnd: new Date('2025-10-01T05:00:00.000Z'),   // 13:00
        status: 'created'
      } as ILeave;

      const existingLeaves = [
        {
          _id: new mongoose.Types.ObjectId(),
          empID: 'EMP001',
          leaveStart: new Date('2025-10-01T03:00:00.000Z'), // 11:00 - overlaps at end
          leaveEnd: new Date('2025-10-01T09:00:00.000Z'),   // 17:00
          status: 'approved'
        }
      ];

      (Leave.find as jest.Mock).mockResolvedValue(existingLeaves);

      const result = await LeaveService.checkLeaveRequestDidntRepeat(mockLeave);

      expect(result).toBe(false);
    });

    test('should return false when new leave completely contains existing leave', async () => {
      const mockLeave = {
        _id: mockObjectId,
        empID: 'EMP001',
        leaveStart: new Date('2025-10-01T00:00:00.000Z'), // 08:00
        leaveEnd: new Date('2025-10-01T10:00:00.000Z'),   // 18:00
        status: 'created'
      } as ILeave;

      const existingLeaves = [
        {
          _id: new mongoose.Types.ObjectId(),
          empID: 'EMP001',
          leaveStart: new Date('2025-10-01T02:00:00.000Z'), // 10:00
          leaveEnd: new Date('2025-10-01T06:00:00.000Z'),   // 14:00
          status: 'approved'
        }
      ];

      (Leave.find as jest.Mock).mockResolvedValue(existingLeaves);

      const result = await LeaveService.checkLeaveRequestDidntRepeat(mockLeave);

      expect(result).toBe(false);
    });

    test('should return false when existing leave completely contains new leave', async () => {
      const mockLeave = {
        _id: mockObjectId,
        empID: 'EMP001',
        leaveStart: new Date('2025-10-01T02:00:00.000Z'), // 10:00
        leaveEnd: new Date('2025-10-01T06:00:00.000Z'),   // 14:00
        status: 'created'
      } as ILeave;

      const existingLeaves = [
        {
          _id: new mongoose.Types.ObjectId(),
          empID: 'EMP001',
          leaveStart: new Date('2025-10-01T00:00:00.000Z'), // 08:00
          leaveEnd: new Date('2025-10-01T10:00:00.000Z'),   // 18:00
          status: 'approved'
        }
      ];

      (Leave.find as jest.Mock).mockResolvedValue(existingLeaves);

      const result = await LeaveService.checkLeaveRequestDidntRepeat(mockLeave);

      expect(result).toBe(false);
    });

    test('should ignore non-approved leaves', async () => {
      const mockLeave = {
        _id: mockObjectId,
        empID: 'EMP001',
        leaveStart: new Date('2025-10-01T01:00:00.000Z'),
        leaveEnd: new Date('2025-10-01T05:00:00.000Z'),
        status: 'created'
      } as ILeave;

      const existingLeaves = [
        {
          _id: new mongoose.Types.ObjectId(),
          empID: 'EMP001',
          leaveStart: new Date('2025-10-01T01:00:00.000Z'), // Same time but rejected
          leaveEnd: new Date('2025-10-01T05:00:00.000Z'),
          status: 'rejected'
        },
        {
          _id: new mongoose.Types.ObjectId(),
          empID: 'EMP001',
          leaveStart: new Date('2025-10-01T01:00:00.000Z'), // Same time but created
          leaveEnd: new Date('2025-10-01T05:00:00.000Z'),
          status: 'created'
        }
      ];

      (Leave.find as jest.Mock).mockResolvedValue(existingLeaves);

      const result = await LeaveService.checkLeaveRequestDidntRepeat(mockLeave);

      expect(result).toBe(true); // Should return true because no approved overlapping leaves
    });
  });

  describe('checkDateRangeOverlap', () => {
    // Test the private method through a public interface or create a test helper
    test('date range overlap logic', () => {
      // Adjacent ranges (no overlap)
      const start1 = new Date('2025-10-01T01:00:00.000Z');
      const end1 = new Date('2025-10-01T05:00:00.000Z');
      const start2 = new Date('2025-10-01T05:00:00.000Z');
      const end2 = new Date('2025-10-01T09:00:00.000Z');

      // Test through the public method
      const mockLeave1 = {
        _id: new mongoose.Types.ObjectId(),
        empID: 'EMP001',
        leaveStart: start1,
        leaveEnd: end1,
        status: 'created'
      } as ILeave;

      const existingLeaves = [
        {
          _id: new mongoose.Types.ObjectId(),
          empID: 'EMP001',
          leaveStart: start2,
          leaveEnd: end2,
          status: 'approved'
        }
      ];

      (Leave.find as jest.Mock).mockResolvedValue(existingLeaves);

      // This should return true (no overlap) for adjacent time ranges
      return LeaveService.checkLeaveRequestDidntRepeat(mockLeave1).then(result => {
        expect(result).toBe(true);
      });
    });
  });
});