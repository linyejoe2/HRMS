import fs from 'fs';
import path from 'path';
import { Attendance, IAttendance, Employee } from '../models';
import { APIError } from '../middleware';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

interface ParsedRecord {
  empID: string;
  date: Date;
  time: Date;
  status: string; // D000 = in, D900 = out
  rawRecord: string;
}

export class AttendanceService {
  
  /**
   * Parse saveData file format
   * Format: 01D{in=000/out=900};00015{8-digit empID}----{YYmmDD}3:{MMss}00197F*G
   * Example: 01D900;0001512638417----2509103:154200197F*G
   */
  private parseSaveDataLine(line: string): ParsedRecord | null {
    if (!line.trim()) return null;
    
    try {
      // Extract components using regex
      const match = line.match(/01.(\d{3})(:|;).....(\d{8})----(\d{6}).:(\d{6})/);
      if (!match) return null;
      
      const [, statusCode, , empID, dateStr, timeStr] = match;

      if (statusCode !== "000" && statusCode !== "900") return null;
      
      // Parse date (YYmmDD format, assuming 25 = 2025)
      const year = 2000 + parseInt(dateStr.substring(0, 2));
      const month = parseInt(dateStr.substring(2, 4)) - 1; // JS months are 0-based
      const day = parseInt(dateStr.substring(4, 6));
      const date = dayjs.tz(`${year}-${month + 1}-${day}`, 'Asia/Taipei').toDate();
      
      // Parse time (MMss format + additional digits)
      const hour = parseInt(timeStr.substring(0, 2));
      const minute = parseInt(timeStr.substring(2, 4));
      const time = dayjs.tz(`${year}-${month}-${day} ${hour}:${minute}`, 'YYYY-MM-DD HH:mm', 'Asia/Taipei').toDate();
      
      return {
        empID: empID,
        date: date,
        time: time,
        status: `D${statusCode}`,
        rawRecord: line.trim()
      };
    } catch (error) {
      console.error(`Error parsing line: ${line}`, error);
      return null;
    }
  }
  
  /**
   * Import attendance records from a saveData file
   */
  async importSaveDataFile(filePath: string): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;
    
    try {
      if (!fs.existsSync(filePath)) {
        throw new APIError(`File not found: ${filePath}`, 404);
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n');
      
      console.log(`Processing ${lines.length} lines from ${filePath}`);
      
      for (const line of lines) {
        const parsed = this.parseSaveDataLine(line);
        if (!parsed) continue;
        // console.log(parsed)
        
        try {
          // Find employee info
          const employee = await Employee.findOne({ empID: parsed.empID });
          
          // Find or create attendance record for this employee and date
          // const dateStr = parsed.date.toISOString().split('T')[0];
          // console.log(dateStr)
          let attendance = await Attendance.findOne({
            empID: parsed.empID,
            date: parsed.date
          });
          
          if (!attendance) {
            attendance = new Attendance({
              empID2: employee?.empID2,
              empID: parsed.empID,
              employeeName: employee?.name,
              department: employee?.department,
              date: parsed.date,
              rawRecord: parsed.rawRecord
            });
          }
          
          // Update attendance based on status
          if (parsed.status === 'D000') {
            // Clock in
            attendance.clockInTime = parsed.time;
            attendance.clockInStatus = parsed.status;
          } else if (parsed.status === 'D900') {
            // Clock out
            attendance.clockOutTime = parsed.time;
            attendance.clockOutStatus = parsed.status;
          }
          
          // Calculate work hours if both times are available
          if (attendance.clockInTime && attendance.clockOutTime) {
            const timeDiff = attendance.clockOutTime.getTime() - attendance.clockInTime.getTime();
            attendance.workHours = timeDiff / (1000 * 60 * 60); // Convert to hours
            
            // Check if late (assuming 9 AM start time)
            const startTime = new Date(attendance.date);
            startTime.setHours(9, 0, 0, 0);
            attendance.isLate = attendance.clockInTime > startTime;
          }
          
          // Check if absent (no clock in by end of day)
          if (!attendance.clockInTime) {
            attendance.isAbsent = true;
          }
          
          await attendance.save();
          imported++;
          
        } catch (error) {
          errors.push(`Error processing record ${parsed.empID}: ${error}`);
          console.error(`Error processing record:`, error);
        }
      }
      
      return { imported, errors };
      
    } catch (error) {
      throw new APIError(`Failed to import file: ${error}`, 500);
    }
  }
  
  /**
   * Import attendance records for a specific date
   */
  async importAttendanceByDate(dateStr: string): Promise<{ imported: number; errors: string[] }> {
    // Format: YYYYMMDD -> 001-YYYYMMDD-saveData.txt
    const formattedDate = dateStr.replace(/-/g, ''); // Remove dashes
    const fileName = `001-${formattedDate}-saveData.txt`;
    const filePath = path.join('./data', fileName);
    
    return this.importSaveDataFile(filePath);
  }
  
  /**
   * Get attendance records for a specific date
   */
  async getAttendanceByDate(dateStr: string): Promise<IAttendance[]> {
    const date = dayjs.tz(dateStr, 'Asia/Taipei').toDate();
    
    return Attendance.find({
      date
    }).sort({ empID2: 1 });
  }
  
  /**
   * Get attendance records for an employee within a date range
   */
  async getEmployeeAttendance(
    empID: string, 
    startDate: string, 
    endDate: string
  ): Promise<IAttendance[]> {
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');
    
    return Attendance.find({
      $or: [
        { empID: empID }
      ],
      date: {
        $gte: start,
        $lte: end
      }
    }).sort({ date: -1 });
  }
  
  /**
   * Get attendance summary for a date range
   */
  async getAttendanceSummary(startDate: string, endDate: string): Promise<{
    totalEmployees: number;
    presentEmployees: number;
    absentEmployees: number;
    lateEmployees: number;
    averageWorkHours: number;
  }> {
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');
    
    const records = await Attendance.find({
      date: { $gte: start, $lte: end }
    });
    
    const totalEmployees = await Employee.countDocuments({ isActive: true });
    const presentEmployees = records.filter(r => !r.isAbsent).length;
    const absentEmployees = records.filter(r => r.isAbsent).length;
    const lateEmployees = records.filter(r => r.isLate).length;
    
    const totalWorkHours = records
      .filter(r => r.workHours)
      .reduce((sum, r) => sum + (r.workHours || 0), 0);
    const averageWorkHours = records.length > 0 ? totalWorkHours / records.length : 0;
    
    return {
      totalEmployees,
      presentEmployees,
      absentEmployees,
      lateEmployees,
      averageWorkHours
    };
  }
}

export const attendanceService = new AttendanceService();