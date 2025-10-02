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
      success: true,
      message: 'Login successful',
      data: result
    });
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const { empID, password } = req.body;
    
    const result = await authService.register(empID, password);
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result
    });
  });

  getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { employeeService } = await import('../services');
    const employee = await employeeService.findById(req.user!.id);

    if (!employee) {
      res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: employee // Also provide as 'user' for frontend compatibility
      }
    });
  });

  getProfileWithSensitive = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        success: false,
        error: '請輸入密碼'
      });
      return;
    }

    const { employeeService } = await import('../services');

    // Verify password first
    const isValidPassword = await employeeService.verifyPassword(req.user!.id, password);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: '密碼錯誤'
      });
      return;
    }

    const employee = await employeeService.findByIdWithSensitive(req.user!.id);

    if (!employee) {
      res.status(404).json({
        success: false,
        error: '找不到員工'
      });
      return;
    }

    res.status(200).json({
      success: true,
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
        success: false,
        error: 'Employee not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { employee: updatedEmployee }
    });
  });

  changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  });

  logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Since we're using stateless JWT, logout is handled client-side
    // We could implement token blacklisting here if needed
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  });
}

export const authController = new AuthController();