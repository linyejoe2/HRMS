import { Response } from 'express';
import { asyncHandler, AuthRequest } from '../middleware';
import { LeaveService } from '../services/leaveService';
import { BusinessTripService } from '../services/businessTripService';
import { PostClockService } from '../services/postClockService';
import { OfficialBusinessService } from '../services/officialBusinessService';

export type PendingManagerRequestType = 'leave' | 'businessTrip' | 'postClock' | 'officialBusiness';

export interface PendingManagerItem {
  requestType: PendingManagerRequestType;
  data: unknown;
}

export const getPendingManagerApprovals = asyncHandler(async (req: AuthRequest, res: Response) => {
  const managerEmpID = req.user!.empID;

  const [leaves, trips, clocks, officialBusinesses] = await Promise.all([
    LeaveService.getPendingManagerLeaveRequests(managerEmpID),
    BusinessTripService.getPendingManagerBusinessTripRequests(managerEmpID),
    PostClockService.getPendingManagerPostClockRequests(managerEmpID),
    OfficialBusinessService.getPendingManagerOfficialBusinessRequests(managerEmpID)
  ]);

  const items: PendingManagerItem[] = [
    ...leaves.map(data => ({ requestType: 'leave' as const, data })),
    ...trips.map(data => ({ requestType: 'businessTrip' as const, data })),
    ...clocks.map(data => ({ requestType: 'postClock' as const, data })),
    ...officialBusinesses.map(data => ({ requestType: 'officialBusiness' as const, data }))
  ];

  res.json({
    error: false,
    message: '成功取得待主管審核清單',
    data: items
  });
});
