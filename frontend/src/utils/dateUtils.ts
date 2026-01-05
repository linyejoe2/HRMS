import dayjs from 'dayjs';

/**
 * Get the month key in YY/MM format from a date string
 * @param dateString ISO 8601 date string
 * @returns Month key in format "YY/MM" (e.g., "27/01")
 */
export const getMonthKey = (dateString: string): string => {
  return dayjs(dateString).format('YY/MM');
};

/**
 * Get the current month key
 * @returns Current month key in format "YY/MM"
 */
export const getCurrentMonthKey = (): string => {
  return dayjs().format('YY/MM');
};

/**
 * Check if a date is in the current month
 * @param dateString ISO 8601 date string
 * @returns true if date is in current month
 */
export const isCurrentMonth = (dateString: string): boolean => {
  return getMonthKey(dateString) === getCurrentMonthKey();
};
