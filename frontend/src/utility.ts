// version 0.0.1
// by Randy Lin
// 2025/09/19

import dayjs from 'dayjs';

/**
 * 
 * @param dateStr ex: 2025-08-10T07:42:00.000Z
 * @returns 
 */
export function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  return dayjs(dateStr).isSame(dayjs(), 'day');
}

/**
 * 
 * @param date ex: 2025-08-10T07:42:00.000Z
 * @returns 2025/08/10 15:42
 */
export function toTaipeiString(date?: string): string {
  if (!date) return dayjs().locale("tw").format('YYYY/MM/DD HH:mm')
  return dayjs(date).locale("tw").format('YYYY/MM/DD HH:mm')
}