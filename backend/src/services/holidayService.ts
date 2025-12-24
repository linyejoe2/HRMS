import { Holiday, IHoliday } from '../models';
import { APIError } from '../middleware/errorHandler';

export class HolidayService {
  /**
   * Get all holidays sorted by date
   */
  async getAllHolidays(): Promise<IHoliday[]> {
    return Holiday.find().sort({ date: 1 });
  }

  /**
   * Get holidays within a date range (for calendar view)
   */
  async getHolidaysByDateRange(startDate: string, endDate: string): Promise<IHoliday[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new APIError('無效的日期格式', 400);
    }

    if (start > end) {
      throw new APIError('開始日期不能晚於結束日期', 400);
    }

    return Holiday.find({
      date: {
        $gte: start,
        $lte: end
      }
    }).sort({ date: 1 });
  }

  /**
   * Get a single holiday by ID
   */
  async getHolidayById(id: string): Promise<IHoliday | null> {
    const holiday = await Holiday.findById(id);
    if (!holiday) {
      throw new APIError('找不到假日', 404);
    }
    return holiday;
  }

  /**
   * Create a new holiday
   */
  async createHoliday(data: {
    date: string | Date;
    type: string;
    name: string;
    pay_rate: number;
    is_paid: boolean;
    memo?: string;
  }): Promise<IHoliday> {
    // Convert string date to Date object
    const holidayDate = new Date(data.date);

    if (isNaN(holidayDate.getTime())) {
      throw new APIError('無效的日期格式', 400);
    }

    // Check for duplicate date
    const existing = await Holiday.findOne({ date: holidayDate });
    if (existing) {
      throw new APIError('該日期已存在假日', 409);
    }

    // Validate pay_rate
    if (data.pay_rate < 0) {
      throw new APIError('支薪倍率不可為負數', 400);
    }

    const holiday = new Holiday({
      date: holidayDate,
      type: data.type,
      name: data.name,
      pay_rate: data.pay_rate,
      is_paid: data.is_paid,
      memo: data.memo
    });

    return holiday.save();
  }

  /**
   * Update an existing holiday
   */
  async updateHoliday(
    id: string,
    data: Partial<{
      date: string | Date;
      type: string;
      name: string;
      pay_rate: number;
      is_paid: boolean;
      memo: string;
    }>
  ): Promise<IHoliday | null> {
    const holiday = await Holiday.findById(id);
    if (!holiday) {
      throw new APIError('找不到假日', 404);
    }

    // If updating date, check for duplicates
    if (data.date) {
      const newDate = new Date(data.date);

      if (isNaN(newDate.getTime())) {
        throw new APIError('無效的日期格式', 400);
      }

      // Check if another holiday exists on this date (excluding current holiday)
      const existing = await Holiday.findOne({
        date: newDate,
        _id: { $ne: id }
      });

      if (existing) {
        throw new APIError('該日期已存在假日', 409);
      }

      holiday.date = newDate;
    }

    // Update other fields
    if (data.type !== undefined) holiday.type = data.type as any;
    if (data.name !== undefined) holiday.name = data.name;
    if (data.pay_rate !== undefined) {
      if (data.pay_rate < 0) {
        throw new APIError('支薪倍率不可為負數', 400);
      }
      holiday.pay_rate = data.pay_rate;
    }
    if (data.is_paid !== undefined) holiday.is_paid = data.is_paid;
    if (data.memo !== undefined) holiday.memo = data.memo;

    return holiday.save();
  }

  /**
   * Delete a holiday
   */
  async deleteHoliday(id: string): Promise<boolean> {
    const result = await Holiday.findByIdAndDelete(id);
    if (!result) {
      throw new APIError('找不到假日', 404);
    }
    return true;
  }

  /**
   * Check if a given date is a holiday
   */
  async isHoliday(date: string | Date): Promise<boolean> {
    const checkDate = new Date(date);
    const holiday = await Holiday.findOne({ date: checkDate });
    return !!holiday;
  }

  /**
   * Get holiday by specific date
   */
  async getHolidayByDate(date: string | Date): Promise<IHoliday | null> {
    const checkDate = new Date(date);
    return Holiday.findOne({ date: checkDate });
  }
}

// Export singleton instance
export const holidayService = new HolidayService();
