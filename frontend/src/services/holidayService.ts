import { api } from './api';

// Holiday type definition
export type HolidayType = '國定假日' | '例假日' | '特殊假日';

// Holiday interface
export interface Holiday {
  _id: string;
  date: string;
  type: HolidayType;
  name: string;
  pay_rate: number;
  is_paid: boolean;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

// Create holiday data
export interface CreateHolidayData {
  date: string;
  type: HolidayType;
  name: string;
  pay_rate: number;
  is_paid: boolean;
  memo?: string;
}

// Update holiday data
export interface UpdateHolidayData extends Partial<CreateHolidayData> {}

// Holiday service class
class HolidayService {
  /**
   * Get all holidays
   */
  async getAllHolidays(): Promise<Holiday[]> {
    const response = await api.get('/holidays');
    return response.data.data.holidays;
  }

  /**
   * Get holidays within a date range
   */
  async getHolidaysByDateRange(startDate: string, endDate: string): Promise<Holiday[]> {
    const response = await api.get('/holidays/range', {
      params: { startDate, endDate }
    });
    return response.data.data.holidays;
  }

  /**
   * Get a single holiday by ID
   */
  async getHolidayById(id: string): Promise<Holiday> {
    const response = await api.get(`/holidays/${id}`);
    return response.data.data.holiday;
  }

  /**
   * Create a new holiday
   */
  async createHoliday(data: CreateHolidayData): Promise<Holiday> {
    const response = await api.post('/holidays', data);
    return response.data.data.holiday;
  }

  /**
   * Update an existing holiday
   */
  async updateHoliday(id: string, data: UpdateHolidayData): Promise<Holiday> {
    const response = await api.put(`/holidays/${id}`, data);
    return response.data.data.holiday;
  }

  /**
   * Delete a holiday
   */
  async deleteHoliday(id: string): Promise<void> {
    await api.delete(`/holidays/${id}`);
  }

  /**
   * Check if a date is a holiday
   */
  async checkIsHoliday(date: string): Promise<{ isHoliday: boolean; holiday: Holiday | null }> {
    const response = await api.get(`/holidays/check/${date}`);
    return response.data.data;
  }
}

// Export singleton instance
export const holidayService = new HolidayService();
