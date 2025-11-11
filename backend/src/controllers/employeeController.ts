import { Request, Response } from 'express';
import { employeeService } from '../services';
import { asyncHandler, AuthRequest } from '../middleware';

export class EmployeeController {
  getAllEmployees = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const department = req.query.department as string;
    
    const result = await employeeService.getAllEmployees(page, limit, department);
    
    res.status(200).json({
      error: false,
      message: '已成功取得員工清單',
      data: result
    });
  });

  getEmployee = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const employee = await employeeService.findById(id);
    
    if (!employee) {
      res.status(404).json({
        error: true,
        message: '找不到員工資料'
      });
      return;
    }

    res.status(200).json({
      error: false,
      message: '已成功取得員工資料',
      data: { employee }
    });
  });

    getEmployeeByEmpID = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const employee = await employeeService.findByEmpID(id);
    
    if (!employee) {
      res.status(404).json({
        error: true,
        message: '找不到員工資料'
      });
      return;
    }

    res.status(200).json({
      error: false,
      message: '已成功取得員工資料',
      data: { employee }
    });
  });

  searchEmployees = asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      res.status(400).json({
        error: true,
        message: '搜尋關鍵字為必填'
      });
      return;
    }

    const employees = await employeeService.searchEmployees(q);

    res.status(200).json({
      error: false,
      message: '已成功搜尋員工',
      data: { employees }
    });
  });

  createEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
    const employeeData = req.body;
    
    const employee = await employeeService.createEmployee(employeeData);
    
    res.status(201).json({
      error: false,
      message: '員工資料成功建立',
      data: { employee }
    });
  });

  updateEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;
    
    const employee = await employeeService.updateEmployee(id, updateData);
    
    if (!employee) {
      res.status(404).json({
        error: true,
        message: '找不到員工資料'
      });
      return;
    }

    res.status(200).json({
      error: false,
      message: '員工資料成功更新',
      data: { employee }
    });
  });

  deleteEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const success = await employeeService.deleteEmployee(id);
    
    if (!success) {
      res.status(404).json({
        error: true,
        message: '找不到員工資料'
      });
      return;
    }

    res.status(200).json({
      error: false,
      message: '員工資料已刪除'
    });
  });
}

export const employeeController = new EmployeeController();