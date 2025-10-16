import { Request, Response, NextFunction } from 'express';
import { toDayjs, toSeparatVariable, calcWarkingDurent, isWeekend } from '../utility';
import { Employee } from '../models/Employee';
import { APIError } from './errorHandler';
import { AuthRequest } from '../middleware/auth';

export const validateLeaveRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { leaveType, reason, leaveStart, leaveEnd } = req.body as { [key: string]: string };
    const empID = req.user!.empID;

    if (!empID) {
      return res.status(401).json({ error: true, message: "未授權的請求" });
    }

    const leaveStartObject = toSeparatVariable(leaveStart)
    const leaveEndObject = toSeparatVariable(leaveEnd)
    const leaveStartDayjs = toDayjs(leaveStart)
    const leaveEndDayjs = toDayjs(leaveEnd)

    if (isWeekend(leaveStart)) 
      return res.status(400).json({ error: true, message: "不得開始於假日" });

    if (isWeekend(leaveEnd)) 
      return res.status(400).json({ error: true, message: "不得結束於假日" });

    if (leaveEndDayjs.isBefore(leaveStartDayjs))
      return res.status(400).json({ error: true, message: "結束時間早於開始時間" });

    // 1. 開始時間不得早於上班時間 830 8:30
    if (parseInt(leaveStartObject.H + leaveStartObject.mm) < 830)
      return res.status(400).json({ error: true, message: "開始時間不得早於上班時間 08:30" });

    // 2. 結束時間不得晚於下班時間(算入彈性一小時) 1830 18:30
    if (parseInt(leaveEndObject.H + leaveEndObject.mm) > 1830)
      return res.status(400).json({ error: true, message: "結束時間不得晚於下班時間 18:30" });

    // 3. 不得從 13:00 開始或結束請假
    if (parseInt(leaveStartObject.H + leaveStartObject.mm) == 1300)
      return res.status(400).json({ error: true, message: "不得從 13:00 開始請假，應從 12:00 開始。" });
    if (parseInt(leaveEndObject.H + leaveEndObject.mm) == 1300)
      return res.status(400).json({ error: true, message: "不得請假到 13:00 ，應請假到 12:00 。" });

    // 4. 普通傷病假規則驗證
    if (leaveType === '普通傷病假' || leaveType === '普通傷病假(住院)') {
      const employee = await Employee.findOne({ empID, isActive: true });
      if (!employee) {
        return res.status(404).json({ error: true, message: "找不到員工資料" });
      }

      // 計算請假天數 (將分鐘轉換為天數，按8小時工作天計算)
      const timeDiff = calcWarkingDurent(leaveStart, leaveEnd);
      const askDays = Math.ceil(timeDiff.durent / (8 * 60)); // 8小時 = 480分鐘

      if (leaveType === '普通傷病假') {
        // 普通傷病假：1年內合計不得超過30日
        const totalDays = employee.sickLeaveDaysInThePastYear + askDays;
        if (totalDays > 30) {
          return res.status(400).json({
            error: true,
            message: "未住院，1年內合計不得超過30日。"
          });
        }
      } else if (leaveType === '普通傷病假(住院)') {
        // 住院傷病假：2年內合計不得超過365日
        const totalDays = employee.sickLeaveDaysInThePastYear +
          employee.sickLeaveDaysInHospitalInThePastYear +
          employee.sickLeaveDaysInThePastTwoYear +
          askDays;
        if (totalDays > 365) {
          return res.status(400).json({
            error: true,
            message: "未住院與住院傷病假2年內合計不得超過1年"
          });
        }
      }
    }

    next();
  } catch (error) {
    console.error('Leave rule validation error:', error);
    return res.status(500).json({ error: true, message: "系統錯誤" });
  }
};