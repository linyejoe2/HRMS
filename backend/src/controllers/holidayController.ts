import { Request, Response } from 'express';
import { holidayService } from '../services/holidayService';
import { holidaySeedService } from '../services/holidaySeedService';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export class HolidayController {
  /**
   * Get all holidays
   * GET /api/holidays
   */
  getAllHolidays = asyncHandler(async (req: Request, res: Response) => {
    const holidays = await holidayService.getAllHolidays();

    res.status(200).json({
      error: false,
      message: '已成功取得假日清單',
      data: { holidays }
    });
  });

  /**
   * Get holidays by date range
   * GET /api/holidays/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  getHolidaysByDateRange = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        error: true,
        message: 'startDate 和 endDate 為必填參數'
      });
      return;
    }

    const holidays = await holidayService.getHolidaysByDateRange(
      startDate as string,
      endDate as string
    );

    res.status(200).json({
      error: false,
      message: '已成功取得假日清單',
      data: { holidays }
    });
  });

  /**
   * Get single holiday by ID
   * GET /api/holidays/:id
   */
  getHolidayById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const holiday = await holidayService.getHolidayById(id);

    res.status(200).json({
      error: false,
      message: '已成功取得假日資料',
      data: { holiday }
    });
  });

  /**
   * Create new holiday
   * POST /api/holidays
   * Requires HR or Admin role
   */
  createHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { date, type, name, pay_rate, is_paid, memo } = req.body;

    // Validate required fields
    if (!date || !type || !name) {
      res.status(400).json({
        error: true,
        message: '日期、類型和名稱為必填欄位'
      });
      return;
    }

    const holidayData = {
      date,
      type,
      name,
      pay_rate: pay_rate !== undefined ? Number(pay_rate) : 1.0,
      is_paid: is_paid !== undefined ? Boolean(is_paid) : true,
      memo
    };

    const holiday = await holidayService.createHoliday(holidayData);

    res.status(201).json({
      error: false,
      message: '假日已成功建立',
      data: { holiday }
    });
  });

  /**
   * Update existing holiday
   * PUT /api/holidays/:id
   * Requires HR or Admin role
   */
  updateHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    // Convert pay_rate to number if provided
    if (updateData.pay_rate !== undefined) {
      updateData.pay_rate = Number(updateData.pay_rate);
    }

    // Convert is_paid to boolean if provided
    if (updateData.is_paid !== undefined) {
      updateData.is_paid = Boolean(updateData.is_paid);
    }

    const holiday = await holidayService.updateHoliday(id, updateData);

    if (!holiday) {
      res.status(404).json({
        error: true,
        message: '找不到假日'
      });
      return;
    }

    res.status(200).json({
      error: false,
      message: '假日已成功更新',
      data: { holiday }
    });
  });

  /**
   * Delete holiday
   * DELETE /api/holidays/:id
   * Requires HR or Admin role
   */
  deleteHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const success = await holidayService.deleteHoliday(id);

    if (!success) {
      res.status(404).json({
        error: true,
        message: '找不到假日'
      });
      return;
    }

    res.status(200).json({
      error: false,
      message: '假日已刪除'
    });
  });

  /**
   * Check if a date is a holiday
   * GET /api/holidays/check/:date
   */
  checkIsHoliday = asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.params;
    const isHoliday = await holidayService.isHoliday(date);
    const holiday = isHoliday ? await holidayService.getHolidayByDate(date) : null;

    res.status(200).json({
      error: false,
      message: isHoliday ? '該日期為假日' : '該日期非假日',
      data: { isHoliday, holiday }
    });
  });

  /**
   * Seed weekend holidays (Saturdays and Sundays) for a specific year
   * POST /api/holidays/seed/weekends
   * Body: { year: number } or { startYear: number, endYear: number }
   * Requires HR or Admin role
   */
  seedWeekendHolidays = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { year, startYear, endYear } = req.body;

    if (year) {
      // Seed for a single year
      const yearNum = Number(year);
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
        res.status(400).json({
          error: true,
          message: '無效的年份（必須在 1900-2100 之間）'
        });
        return;
      }

      const result = await holidaySeedService.seedWeekendHolidays(yearNum);

      res.status(200).json({
        error: false,
        message: `${yearNum}年週末假日已產生`,
        data: {
          year: yearNum,
          created: result.created,
          skipped: result.skipped,
          total: result.created + result.skipped
        }
      });
    } else if (startYear && endYear) {
      // Seed for a range of years
      const startYearNum = Number(startYear);
      const endYearNum = Number(endYear);

      if (
        isNaN(startYearNum) ||
        isNaN(endYearNum) ||
        startYearNum < 1900 ||
        endYearNum > 2100 ||
        startYearNum > endYearNum
      ) {
        res.status(400).json({
          error: true,
          message: '無效的年份範圍'
        });
        return;
      }

      const result = await holidaySeedService.seedWeekendHolidaysByRange(
        startYearNum,
        endYearNum
      );

      res.status(200).json({
        error: false,
        message: `${startYearNum}-${endYearNum}年週末假日已產生`,
        data: {
          totalCreated: result.totalCreated,
          totalSkipped: result.totalSkipped,
          years: result.years
        }
      });
    } else {
      res.status(400).json({
        error: true,
        message: '請提供 year 或 startYear 和 endYear'
      });
    }
  });

  /**
   * Clear auto-generated weekend holidays
   * DELETE /api/holidays/seed/weekends
   * Requires HR or Admin role
   */
  clearAutoGeneratedWeekends = asyncHandler(async (req: AuthRequest, res: Response) => {
    const deletedCount = await holidaySeedService.clearAutoGeneratedWeekendHolidays();

    res.status(200).json({
      error: false,
      message: `已刪除 ${deletedCount} 個自動產生的週末假日`,
      data: { deletedCount }
    });
  });
}

// Export controller instance
export const holidayController = new HolidayController();
