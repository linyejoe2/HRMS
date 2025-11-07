import { LeaveRequest } from '../types';

/**
 * Calculate total used minutes from leave requests
 * @param leaves Array of leave requests
 * @returns Total minutes used
 */
export const calculateUsedMinutes = (leaves: LeaveRequest[]): number => {
  return leaves.reduce((total, leave) => {
    const hours = parseInt(leave.hour) || 0;
    const minutes = parseInt(leave.minutes) || 0;
    return total + (hours * 60) + minutes;
  }, 0);
};

/**
 * Convert minutes to hours (decimal)
 * @param minutes Total minutes
 * @returns Hours as decimal number
 */
export const minutesToHours = (minutes: number): number => {
  return minutes / 60;
};

/**
 * Convert minutes to days (8-hour workday)
 * @param minutes Total minutes
 * @returns Days as decimal number
 */
export const minutesToDays = (minutes: number): number => {
  return minutes / (8 * 60);
};

/**
 * Calculate remaining personal leave in minutes (事假)
 * Total allocation: 14 days = 112 hours = 6720 minutes per year
 * @param leaves Array of approved personal leave requests
 * @returns Remaining minutes
 */
export const calculateRemainingPersonalLeaveMinutes = (leaves: LeaveRequest[]): number => {
  const totalMinutes = 14 * 8 * 60; // 14 days * 8 hours * 60 minutes = 6720 minutes
  const usedMinutes = calculateUsedMinutes(leaves);
  return Math.max(0, totalMinutes - usedMinutes);
};

/**
 * Calculate remaining personal leave in hours (事假)
 * @param leaves Array of approved personal leave requests
 * @returns Remaining hours
 */
export const calculateRemainingPersonalLeaveHours = (leaves: LeaveRequest[]): number => {
  return minutesToHours(calculateRemainingPersonalLeaveMinutes(leaves));
};

/**
 * Calculate remaining sick leave in minutes (病假)
 * Total allocation: 30 days = 240 hours = 14400 minutes per year
 * @param leaves Array of approved sick leave requests
 * @returns Remaining minutes
 */
export const calculateRemainingSickLeaveMinutes = (leaves: LeaveRequest[]): number => {
  const totalMinutes = 30 * 8 * 60; // 30 days * 8 hours * 60 minutes = 14400 minutes
  const usedMinutes = calculateUsedMinutes(leaves);
  return Math.max(0, totalMinutes - usedMinutes);
};

/**
 * Calculate remaining sick leave in hours (病假)
 * @param leaves Array of approved sick leave requests
 * @returns Remaining hours
 */
export const calculateRemainingSickLeaveHours = (leaves: LeaveRequest[]): number => {
  return minutesToHours(calculateRemainingSickLeaveMinutes(leaves));
};

/**
 * Calculate total special leave entitlement in days based on hire date
 * @param hireDate Employee hire date
 * @returns Total days entitled
 */
export const calculateSpecialLeaveEntitlementDays = (hireDate: Date): number => {
  const now = new Date();
  const hireDateObj = new Date(hireDate);

  // Calculate months of service
  const monthsDiff = (now.getFullYear() - hireDateObj.getFullYear()) * 12 +
    (now.getMonth() - hireDateObj.getMonth());

  // Calculate years of service (including partial years)
  const yearsDiff = monthsDiff / 12;

  if (monthsDiff < 6) {
    return 0; // Less than 6 months
  } else if (yearsDiff < 1) {
    return 3; // 6 months to 1 year
  } else if (yearsDiff < 2) {
    return 7; // 1-2 years
  } else if (yearsDiff < 3) {
    return 10; // 2-3 years
  } else if (yearsDiff < 5) {
    return 14; // 3-5 years
  } else if (yearsDiff < 10) {
    return 15; // 5-10 years
  } else {
    // 10 years and above: 16 + (years - 10), max 30 days
    const additionalYears = Math.floor(yearsDiff) - 10;
    return Math.min(16 + additionalYears, 30);
  }
};

/**
 * Calculate total special leave entitlement in minutes based on hire date
 * @param hireDate Employee hire date
 * @returns Total minutes entitled
 */
export const calculateSpecialLeaveEntitlementMinutes = (hireDate: Date): number => {
  const days = calculateSpecialLeaveEntitlementDays(hireDate);
  return days * 8 * 60; // days * 8 hours * 60 minutes
};

/**
 * Calculate cumulative special leave entitlement from hire date to now in days
 * This calculates the total accumulated special leave days since hire
 * Examples:
 *   - At 6 months: 3 days total
 *   - At 1 year: 3 + 7 = 10 days total
 *   - At 2 years: 3 + 7 + 10 = 20 days total
 *   - At 3 years: 3 + 7 + 10 + 14 = 34 days total
 *   - At 5 years: 3 + 7 + 10 + 14 + 14 + 15 = 63 days total
 *   - At 10 years: 3 + 7 + 10 + (14×2) + (15×5) = 128 days total
 *   - At 11 years: 128 + 16 = 144 days total
 *   - At 12 years: 144 + 17 = 161 days total
 * @param hireDate Employee hire date
 * @returns Cumulative days from hire to now
 */
export const calculateSpecialLeaveEntitlementCumulativeDays = (hireDate: Date): number => {
  const now = new Date();
  const hireDateObj = new Date(hireDate);

  // Calculate months of service
  const monthsDiff = (now.getFullYear() - hireDateObj.getFullYear()) * 12 +
    (now.getMonth() - hireDateObj.getMonth());

  // Calculate full years of service
  const fullYears = Math.floor(monthsDiff / 12);

  let cumulativeDays = 0;

  // Less than 6 months: no leave
  if (monthsDiff < 6) {
    return 0;
  }

  // 6 months to 1 year: 3 days (one-time grant)
  if (monthsDiff >= 6) {
    cumulativeDays += 3;
  }

  // For each completed year, add the appropriate days
  for (let year = 1; year <= fullYears; year++) {
    if (year === 1) {
      // 1st year (1-2 years of service): 7 days
      cumulativeDays += 7;
    } else if (year === 2) {
      // 2nd year (2-3 years of service): 10 days
      cumulativeDays += 10;
    } else if (year >= 3 && year < 5) {
      // 3rd-4th year (3-5 years of service): 14 days per year
      cumulativeDays += 14;
    } else if (year >= 5 && year < 10) {
      // 5th-9th year (5-10 years of service): 15 days per year
      cumulativeDays += 15;
    } else if (year >= 10) {
      // 10th year and beyond: 16, 17, 18... days (max 30 per year)
      const yearsSince10 = year - 10;
      cumulativeDays += Math.min(16 + yearsSince10, 30);
    }
  }

  return cumulativeDays;
};

/**
 * Calculate cumulative special leave entitlement in minutes
 * @param hireDate Employee hire date
 * @returns Cumulative minutes from hire to now
 */
export const calculateSpecialLeaveEntitlementCumulativeMinutes = (hireDate: Date): number => {
  const days = calculateSpecialLeaveEntitlementCumulativeDays(hireDate);
  return days * 8 * 60; // days * 8 hours * 60 minutes
};

/**
 * Calculate remaining special leave in minutes (特休)
 * @param leaves Array of approved special leave requests
 * @param hireDate Employee hire date (optional)
 * @returns Remaining minutes
 */
export const calculateRemainingSpecialLeaveMinutes = (leaves: LeaveRequest[], hireDate?: Date): number => {
  if (!hireDate) {
    return 0;
  }

  const totalMinutes = calculateSpecialLeaveEntitlementCumulativeMinutes(hireDate);
  const usedMinutes = calculateUsedMinutes(leaves);
  return Math.max(0, totalMinutes - usedMinutes);
};

/**
 * Calculate remaining special leave in hours (特休)
 * @param leaves Array of approved special leave requests
 * @param hireDate Employee hire date (optional)
 * @returns Remaining hours
 */
export const calculateRemainingSpecialLeaveHours = (leaves: LeaveRequest[], hireDate?: Date): number => {
  return minutesToHours(calculateRemainingSpecialLeaveMinutes(leaves, hireDate));
};

/**
 * Format minutes to display format (hours with 1 decimal place)
 * @param minutes Total minutes
 * @returns Formatted string (e.g., "112.0 小時")
 */
export const formatMinutesToHours = (minutes: number): string => {
  const hours = minutesToHours(minutes);
  return `${hours.toFixed(1)} 小時`;
};

/**
 * Get color for remaining leave display based on hours
 * @param remainingHours Remaining hours
 * @param isSpecialOrPersonal Whether this is special leave or personal leave (true) or sick leave (false)
 * @returns Color string: 'success' | 'warning' | 'error'
 */
export const getLeaveColorByHours = (remainingHours: number, isSpecialOrPersonal: boolean = true): 'success' | 'warning' | 'error' => {
  if (isSpecialOrPersonal) {
    // For special leave and personal leave
    // > 56 hours (7 days): green
    // 24-56 hours (3-7 days): warning
    // < 24 hours (3 days): red
    if (remainingHours > 56) return 'success';
    if (remainingHours > 24) return 'warning';
    return 'error';
  } else {
    // For sick leave
    // > 120 hours (15 days): green
    // 56-120 hours (7-15 days): warning
    // < 56 hours (7 days): red
    if (remainingHours > 120) return 'success';
    if (remainingHours > 56) return 'warning';
    return 'error';
  }
};
