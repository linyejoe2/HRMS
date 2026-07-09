import { api } from './api';
import { LeaveRequest, LeaveAdjustment } from '../types';

export const RESERVATION_LEAVE_TYPES: { type: string; displayName: string }[] = [
  { type: '婚假', displayName: '婚假' },
  { type: '喪假', displayName: '喪假' },
  { type: '生理假', displayName: '生理假' },
  { type: '公傷病假', displayName: '公傷病假' },
  { type: '公假', displayName: '公假' },
  { type: '產假', displayName: '產假' },
  { type: '產檢假', displayName: '產檢假' },
  { type: '陪產檢及陪產假', displayName: '陪產檢及陪產假' },
  { type: '安胎休養請假', displayName: '安胎休養請假' },
  { type: '育嬰留職停薪', displayName: '育嬰留職停薪' },
];

export const ReservationLeaveTypes = [
  '婚假',
  '喪假',
  '生理假',
  // '普通傷病假(住院)',
  '公假',
  '公傷病假',
  '產假',
  '產檢假',
  '陪產檢及陪產假',
  // '家庭照顧假',
  '安胎休養請假',
  '育嬰留職停薪'
];

export const LeaveTypes = [
  '普通傷病假',
  '事假',
  '特別休假',
  ...ReservationLeaveTypes
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
