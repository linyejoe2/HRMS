import { api } from './api';
import { LeaveRequest, LeaveAdjustment } from '../types';

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
  personalLeave: LeaveData;
  sickLeave: LeaveData;
  specialLeave: LeaveData;
  reservationLeaves: LeaveData[];
}

export async function fetchUserLeaveData(empID: string): Promise<UserLeaveData> {
  const response = await api.get(`/leave/balance/${empID}`);
  return response.data.data;
}
