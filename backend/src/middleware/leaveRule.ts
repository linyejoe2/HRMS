import { Request, Response, NextFunction } from 'express';
import { toDayjs, toSeparatVariable, isWeekend } from '../utility';
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

    next();
  } catch (error) {
    console.error('Leave rule validation error:', error);
    return res.status(500).json({ error: true, message: "系統錯誤" });
  }
};