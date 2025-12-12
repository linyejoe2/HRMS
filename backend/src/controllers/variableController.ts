import { Request, Response } from 'express';
import { variableService } from '../services';
import { asyncHandler, AuthRequest } from '../middleware';

export class VariableController {
  /**
   * GET /api/variables
   * Get all variables, optionally filtered by section
   */
  getAllVariables = asyncHandler(async (req: Request, res: Response) => {
    const section = req.query.section as string;
    const includeInactive = req.query.includeInactive === 'true';

    const variables = await variableService.getAllVariables(section, includeInactive);

    res.status(200).json({
      error: false,
      message: '已成功取得變數清單',
      data: { variables }
    });
  });

  /**
   * GET /api/variables/sections
   * Get all unique sections
   */
  getSections = asyncHandler(async (req: Request, res: Response) => {
    const sections = await variableService.getSections();

    res.status(200).json({
      error: false,
      message: '已成功取得分類清單',
      data: { sections }
    });
  });

  /**
   * GET /api/variables/section/:section
   * Get variables by section
   */
  getBySection = asyncHandler(async (req: Request, res: Response) => {
    const { section } = req.params;
    const includeInactive = req.query.includeInactive === 'true';

    const variables = await variableService.getBySection(section, includeInactive);

    res.status(200).json({
      error: false,
      message: `已成功取得 ${section} 變數清單`,
      data: { variables }
    });
  });

  /**
   * GET /api/variables/:id
   * Get variable by ID
   */
  getVariable = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const variable = await variableService.getById(id);

    if (!variable) {
      res.status(404).json({
        error: true,
        message: '找不到變數'
      });
      return;
    }

    res.status(200).json({
      error: false,
      message: '已成功取得變數',
      data: { variable }
    });
  });

  /**
   * GET /api/variables/code/:section/:code
   * Get variable by section and code
   */
  getByCode = asyncHandler(async (req: Request, res: Response) => {
    const { section, code } = req.params;

    const variable = await variableService.getByCode(section, code);

    if (!variable) {
      res.status(404).json({
        error: true,
        message: '找不到變數'
      });
      return;
    }

    res.status(200).json({
      error: false,
      message: '已成功取得變數',
      data: { variable }
    });
  });

  /**
   * POST /api/variables
   * Create a new variable
   */
  createVariable = asyncHandler(async (req: AuthRequest, res: Response) => {
    const variableData = req.body;

    const variable = await variableService.createVariable(variableData);

    res.status(201).json({
      error: false,
      message: '變數已成功建立',
      data: { variable }
    });
  });

  /**
   * POST /api/variables/bulk
   * Bulk create variables
   */
  bulkCreateVariables = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { variables } = req.body;

    if (!Array.isArray(variables)) {
      res.status(400).json({
        error: true,
        message: '請提供變數陣列'
      });
      return;
    }

    const createdVariables = await variableService.bulkCreateVariables(variables);

    res.status(201).json({
      error: false,
      message: `已成功建立 ${createdVariables.length} 個變數`,
      data: { variables: createdVariables }
    });
  });

  /**
   * PUT /api/variables/:id
   * Update a variable
   */
  updateVariable = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const variable = await variableService.updateVariable(id, updateData);

    if (!variable) {
      res.status(404).json({
        error: true,
        message: '找不到變數'
      });
      return;
    }

    res.status(200).json({
      error: false,
      message: '變數已成功更新',
      data: { variable }
    });
  });

  /**
   * DELETE /api/variables/:id
   * Delete a variable (soft delete by default)
   */
  deleteVariable = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const hardDelete = req.query.hard === 'true';

    const success = await variableService.deleteVariable(id, hardDelete);

    if (!success) {
      res.status(404).json({
        error: true,
        message: '找不到變數'
      });
      return;
    }

    res.status(200).json({
      error: false,
      message: hardDelete ? '變數已刪除' : '變數已停用'
    });
  });
}

export const variableController = new VariableController();
