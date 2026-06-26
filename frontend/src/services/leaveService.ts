import { formatMinutesToHours, calculateRemainingPersonalLeaveMinutes, calculateUsedMinutes, minutesToHours, calculateRemainingSickLeaveMinutes, calculateRemainingSpecialLeaveMinutes, calculateSpecialLeaveEntitlementDays } from '@/utils/leaveCalculations';
import { LeaveRequest, LeaveAdjustment } from '../types';
import { leaveAdjustmentAPI, queryLeaveRequests } from './api';

// Add entries here to put a leave type into "reservation mode":
// HR manually charges hours via LeaveAdjustment; totalHours = sum of adjustments (default 0).
export const RESERVATION_LEAVE_TYPES: { type: string; displayName: string }[] = [
  { type: '婚假', displayName: '婚假' },
  { type: '喪假', displayName: '喪假' },
];

export interface LeaveData {
  type: string;
  displayName: string;
  totalHours: number;
  usedHours: number;
  remainingHours: number;
  leaves: LeaveRequest[];
  adjustments: LeaveAdjustment[];
}

export interface UserLeaveData {
  personalLeave: LeaveData,
  sickLeave: LeaveData,
  specialLeave: LeaveData,
  reservationLeaves: LeaveData[], // same order as RESERVATION_LEAVE_TYPES
}

export async function fetchUserLeaveData(empID: string, hireDate: string): Promise<UserLeaveData> {
  const now = new Date();
  const oneYearAgo = new Date();
  const oneYearLater = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  oneYearLater.setFullYear(now.getFullYear() + 1);

  // Fetch all leave types
  const [personalResponse, sickResponse, specialResponse] = await Promise.all([
    queryLeaveRequests({
      timeStart: oneYearAgo.toISOString(),
      timeEnd: oneYearLater.toISOString(),
      leaveType: '事假',
      status: 'approved'
    }),
    queryLeaveRequests({
      timeStart: oneYearAgo.toISOString(),
      timeEnd: oneYearLater.toISOString(),
      leaveType: '普通傷病假',
      status: 'approved'
    }),
    queryLeaveRequests({
      timeStart: oneYearAgo.toISOString(),
      timeEnd: oneYearLater.toISOString(),
      leaveType: '特別休假',
      status: 'approved'
    })
  ]);

    // Fetch all adjustments
  const [personalAdjustment, sickAdjustment, specialAdjustment] = await Promise.all([
    leaveAdjustmentAPI.getByEmployee(empID, '事假'),
    leaveAdjustmentAPI.getByEmployee(empID, '普通傷病假'),
    leaveAdjustmentAPI.getByEmployee(empID, '特別休假')
  ]);

  // Filter leaves by employee ID
  const personalLeaves = personalResponse.data.data.filter((l: LeaveRequest) => l.empID === empID);
  const sickLeaves = sickResponse.data.data.filter((l: LeaveRequest) => l.empID === empID);
  const specialLeaves = specialResponse.data.data.filter((l: LeaveRequest) => l.empID === empID);

  // Calculate personal leave using utility function
  const personalRemainingHours = formatMinutesToHours(calculateRemainingPersonalLeaveMinutes(personalLeaves, personalAdjustment.data.data));
  const personalUsedMinutes = calculateUsedMinutes(personalLeaves);
  const personalUsedHours = minutesToHours(personalUsedMinutes);
  const personalTotalHours = 14 * 8; // 14 days * 8 hours = 112 hours

  // Calculate sick leave using utility function
  const sickRemainingHours = formatMinutesToHours(calculateRemainingSickLeaveMinutes(sickLeaves, sickAdjustment.data.data));
  const sickUsedMinutes = calculateUsedMinutes(sickLeaves);
  const sickUsedHours = minutesToHours(sickUsedMinutes);
  const sickTotalHours = 30 * 8; // 30 days * 8 hours = 240 hours


  // Calculate special leave using utility function
  const hireDateObj = hireDate ? new Date(hireDate) : undefined;
  const specialRemainingHours = formatMinutesToHours(calculateRemainingSpecialLeaveMinutes(specialLeaves, hireDateObj, specialAdjustment.data.data));
  const specialUsedMinutes = calculateUsedMinutes(specialLeaves);
  const specialUsedHours = minutesToHours(specialUsedMinutes);
  const specialTotalDays = hireDateObj ? calculateSpecialLeaveEntitlementDays(hireDateObj) : 0;
  const specialTotalHours = specialTotalDays * 8;

  // Fetch reservation-mode leave types (婚假, 喪假, …)
  const [reservationLeaveResponses, reservationAdjResponses] = await Promise.all([
    Promise.all(RESERVATION_LEAVE_TYPES.map(rt =>
      queryLeaveRequests({
        timeStart: oneYearAgo.toISOString(),
        timeEnd: oneYearLater.toISOString(),
        leaveType: rt.type,
        status: 'approved'
      })
    )),
    Promise.all(RESERVATION_LEAVE_TYPES.map(rt =>
      leaveAdjustmentAPI.getByEmployee(empID, rt.type)
    ))
  ]);

  const reservationLeaves: LeaveData[] = RESERVATION_LEAVE_TYPES.map((rt, i) => {
    const adjData = reservationAdjResponses[i].data.data;
    const leaveRecords = reservationLeaveResponses[i].data.data.filter((l: LeaveRequest) => l.empID === empID);
    const totalMinutes = adjData.reduce((sum: number, adj: LeaveAdjustment) => sum + adj.minutes, 0);
    const usedMinutes = calculateUsedMinutes(leaveRecords);
    return {
      type: rt.type,
      displayName: rt.displayName,
      totalHours: minutesToHours(Math.max(0, totalMinutes)),
      usedHours: minutesToHours(usedMinutes),
      remainingHours: minutesToHours(totalMinutes - usedMinutes),
      leaves: leaveRecords,
      adjustments: adjData
    };
  });

  return ({
    personalLeave: {
      type: '事假',
      displayName: '事假',
      totalHours: personalTotalHours,
      usedHours: personalUsedHours,
      remainingHours: personalRemainingHours,
      adjustments: personalAdjustment.data.data,
      leaves: personalLeaves
    },
    sickLeave: {
      type: '普通傷病假',
      displayName: '病假',
      totalHours: sickTotalHours,
      usedHours: sickUsedHours,
      remainingHours: sickRemainingHours,
      adjustments: sickAdjustment.data.data,
      leaves: sickLeaves
    },
    specialLeave: {
      type: '特別休假',
      displayName: '特休',
      totalHours: specialTotalHours,
      usedHours: specialUsedHours,
      remainingHours: specialRemainingHours,
      adjustments: specialAdjustment.data.data,
      leaves: specialLeaves
    },
    reservationLeaves
  });
}