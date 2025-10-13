import { Request, Response } from 'express';
import { authService } from '../services';
import { asyncHandler, AuthRequest } from '../middleware';

export class AuthController {
  login = asyncHandler(async (req: Request, res: Response) => {
    // console.log("req")
    // console.log(req.body)
    const { empID, password } = req.body;
    
    const result = await authService.login(empID, password);
    
    res.status(200).json({
      error: false,
      message: '登入成功',
      data: result
    });
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const { empID, password } = req.body;
    
    const result = await authService.register(empID, password);
    
    res.status(201).json({
      error: false,
      message: '註冊成功',
      data: result
    });
  });

  getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { employeeService } = await import('../services');
    const employee = await employeeService.findById(req.user!.id);

    if (!employee) {
      res.status(404).json({
        error: true,
        message: '找不到員工資料'
      });
      return;
    }

    res.status(200).json({
      error: false,
      message: '已成功取得個人資料',
      data: {
        user: employee // Also provide as 'user' for frontend compatibility
      }
    });
  });

  getProfileWithSensitive = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { password, employee_id } = req.body;

    if (!password) {
      res.status(400).json({
        error: true,
        message: '請輸入密碼'
      });
      return;
    }

    const { employeeService } = await import('../services');

    // Determine target employee ID
    const targetEmployeeId = employee_id || req.user!.id;

    // Check if user is trying to access another employee's data
    if (employee_id && employee_id !== req.user!.id) {
      // Only HR and Admin can access other employees' sensitive data
      if (req.user!.role !== 'hr' && req.user!.role !== 'admin') {
        res.status(403).json({
          error: true,
          message: '權限不足，無法查看其他員工的敏感資訊'
        });
        return;
      }
    }

    // Verify password first (always verify current user's password)
    const isValidPassword = await employeeService.verifyPassword(req.user!.id, password);
    if (!isValidPassword) {
      res.status(401).json({
        error: true,
        message: '密碼錯誤'
      });
      return;
    }

    const employee = await employeeService.findByIdWithSensitive(targetEmployeeId);

    if (!employee) {
      res.status(404).json({
        error: true,
        message: '找不到員工資料'
      });
      return;
    }

    res.status(200).json({
      error: false,
      message: '已成功取得個人敏感資料',
      data: {
        user: employee
      }
    });
  });

  updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { employeeService } = await import('../services');
    const { department } = req.body;
    
    const updatedEmployee = await employeeService.updateEmployee(req.user!.id, {
      department
    });
    
    if (!updatedEmployee) {
      res.status(404).json({
        error: true,
        message: '找不到員工資料'
      });
      return;
    }

    res.status(200).json({
      error: false,
      message: '個人資料已更新',
      data: { employee: updatedEmployee }
    });
  });

  changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    
    res.status(200).json({
      error: false,
      message: '密碼已變更'
    });
  });

  logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Since we're using stateless JWT, logout is handled client-side
    // We could implement token blacklisting here if needed
    res.status(200).json({
      error: false,
      message: '已登出'
    });
  });
}

export const authController = new AuthController();