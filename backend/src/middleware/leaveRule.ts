import { Request, Response, NextFunction } from 'express';
import { toSeparatVariable } from '../utility';

export const validateLeaveRule = (req: Request, res: Response, next: NextFunction) => {
  const { leaveType, reason, leaveStart, leaveEnd } = req.body as { [key: string]: string };

  const leaveStartObject = toSeparatVariable(leaveStart)
  const leaveEndObject = toSeparatVariable(leaveEnd)
  // console.log("leaveStartObject")
  // console.log("leaveEndObject")
  // console.log(JSON.stringify(leaveStartObject))
  // console.log(JSON.stringify(leaveEndObject))

  // 1. 開始時間不得早於上班時間 830 8:30
  if (parseInt(leaveStartObject.H + leaveStartObject.mm) < 830)
    return res.status(400).json({ success: false, message: "開始時間不得早於上班時間 08:30" });

  // 2. 結束時間不得晚於下班時間(算入彈性一小時) 1830 18:30
  if (parseInt(leaveEndObject.H + leaveEndObject.mm) > 1830)
    return res.status(400).json({ success: false, message: "結束時間不得晚於下班時間 18:30" });

  // 3. 不得從 13:00 開始或結束請假 
  if (parseInt(leaveStartObject.H + leaveStartObject.mm) == 1300) return res.status(400).json({ success: false, message: "不得從 13:00 開始請假，應從 12:00 開始。" });
  if (parseInt(leaveEndObject.H + leaveEndObject.mm) == 1300) return res.status(400).json({ success: false, message: "不得請假到 13:00 ，應請假到 12:00 。" });

  next();
};