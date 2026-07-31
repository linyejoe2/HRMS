export const CONFIG = {
  workingTime: {
    timezone: "Asia/Taipei",
    workStart: { hour: 8, minute: 30, },
    lunchStart: { hour: 12, minute: 0, },
    lunchEnd: { hour: 13, minute: 0, },
    workEnd: { hour: 17, minute: 30, },
    standardHalfDayMinutes: 4 * 60, // 4小時 = 240分
    morningMinutes: 3.5 * 60, // 實際上午長度 210分
    afternoonMinutes: 4.5 * 60, // 實際下午長度 270分
  }
};