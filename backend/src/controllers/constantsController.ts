import { Response } from 'express';
import { asyncHandler, AuthRequest } from '../middleware';
import { CONST } from '../constants';

export const getConstants = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({
    error: false,
    message: '成功取得系統常數',
    data: CONST
  });
});
