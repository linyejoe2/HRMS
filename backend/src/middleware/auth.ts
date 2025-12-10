import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Employee } from '../models';
import { config } from '../config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    empID: string;
    name: string;
    role: string;
    department?: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: true, message: '需要存取權杖' });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as any;

    // Verify user still exists and is active
    const user = await Employee.findById(decoded.id).select('+password');
    if (!user || !user.isActive) {
      res.status(401).json({ error: true, message: '無效或過期的權杖' });
      return;
    }

    // Update lastLogin timestamp on every authenticated request
    await Employee.findByIdAndUpdate(decoded.id, { lastLogin: new Date() });

    req.user = {
      id: (user._id as any).toString(),
      empID: user.empID,
      name: user.name,
      role: user.role,
      department: user.department
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: true, message: '無效的權杖' });
      return;
    }
    res.status(500).json({ error: true, message: '認證錯誤' });
  }
};

export const requireRole = (roles: string | string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: true, message: '需要身分驗證' });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: true, message: '權限不足' });
      return;
    }

    next();
  };
};