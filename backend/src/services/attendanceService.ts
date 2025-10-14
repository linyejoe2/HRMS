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
  cardID: string;
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
      const month = parseInt(dateStr.substring(2, 4));
      const day = parseInt(dateStr.substring(4, 6));
      const date = dayjs.tz(`${year}-${month}-${day}`, 'Asia/Taipei').toDate();
      
      // Parse time (MMss format + additional digits)
      const hour = parseInt(timeStr.substring(0, 2));
      const minute = parseInt(timeStr.substring(2, 4));
      const time = dayjs.tz(`${year}-${month}-${day} ${hour}:${minute}`, 'YYYY-MM-DD HH:mm', 'Asia/Taipei').toDate();
      
      return {
        cardID: empID,
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

      for (const l of lines) {
        console.log("line: ", l)
      }
      
      for (const line of lines) {
        const parsed = this.parseSaveDataLine(line);
        if (!parsed) continue;
        // console.log(parsed)
        
        try {
          // Find employee info
          const employee = await Employee.findOne({ cardID: parsed.cardID });
          
          // Find or create attendance record for this employee and date
          // const dateStr = parsed.date.toISOString().split('T')[0];
          // console.log(dateStr)
          let attendance = await Attendance.findOne({
            cardID: parsed.cardID,
            date: parsed.date
          });
          
          if (!attendance) {
            attendance = new Attendance({
              cardID: parsed.cardID,
              employeeName: employee?.name,
              department: employee?.department,
              date: parsed.date
            });
          } else {
            // Update existing attendance record with latest employee data
            if (employee) {
              attendance.cardID = employee.cardID;
              attendance.employeeName = employee.name;
              attendance.department = employee.department;
            }
          }
          
          // Update attendance based on status
          if (parsed.status === 'D000') {
            // Clock in
            attendance.clockInRawRecord = parsed.rawRecord;
            attendance.clockInTime = parsed.time;
            attendance.clockInStatus = parsed.status;
          } else if (parsed.status === 'D900') {
            // Clock out
            attendance.clockOutRawRecord = parsed.rawRecord;
            attendance.clockOutTime = parsed.time;
            attendance.clockOutStatus = parsed.status;
          }
          
          // Calculate work hours if both times are available
          if (attendance.clockInTime && attendance.clockOutTime) {
            const workDurationObj = this.calcWorkDuration(attendance.clockInTime, attendance.clockOutTime);
            console.log("workDurationObj")
            console.log(JSON.stringify(workDurationObj))
            
            attendance.workDuration = workDurationObj.duration
            attendance.lateMinute = workDurationObj.lateMinute
            attendance.isLate = workDurationObj.isLate
            attendance.isEarlyLeave = workDurationObj.isEarlyLeave
          }
          
          // Check if absent (no clock in by end of day)
          if (!attendance.clockInTime || !attendance.clockOutTime){
            attendance.isAbsent = true
          } else {
            attendance.isAbsent = false
          }

          await attendance.save();
          imported++;
          
        } catch (error) {
          errors.push(`Error processing record ${parsed.cardID}: ${error}`);
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
   * Get attendance records for a specific date with role-based filtering
   */
  async getAttendanceByDate(
    dateStr: string, 
    userRole: string, 
    userEmpID: string, 
    userDepartment?: string
  ): Promise<IAttendance[]> {
    const date = dayjs.tz(dateStr, 'Asia/Taipei').toDate();
    
    let query: any = { date };
    
    // Role-based filtering
    if (userRole === 'admin' || userRole === 'hr') {
      // HR and admin can see all user data - no additional filter needed
    } else if (userRole === 'manager') {
      // Manager can see same department's employee data
      if (userDepartment) {
        query.department = userDepartment;
      } else {
        // If manager has no department, they can only see their own data
        query.empID = userEmpID;
      }
    } else {
      // Employee can only see self's data
      query.empID = userEmpID;
    }
    
    return Attendance.find(query).sort({ empID: 1 });
  }

  /**
   * Get attendance records for a date range with role-based filtering
   */
  async getAttendanceByDateRange(
    startDateStr: string, 
    endDateStr: string, 
    userRole: string, 
    userEmpID: string, 
    userDepartment?: string
  ): Promise<IAttendance[]> {
    const startDate = dayjs.tz(startDateStr, 'Asia/Taipei').startOf('day').toDate();
    const endDate = dayjs.tz(endDateStr, 'Asia/Taipei').endOf('day').toDate();
    
    let query: any = {
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    // Role-based filtering
    if (userRole === 'admin' || userRole === 'hr') {
      // HR and admin can see all user data - no additional filter needed
    } else if (userRole === 'manager') {
      // Manager can see same department's employee data
      if (userDepartment) {
        query.department = userDepartment;
      } else {
        // If manager has no department, they can only see their own data
        query.empID = userEmpID;
      }
    } else {
      // Employee can only see self's data
      query.empID = userEmpID;
    }
    
    return Attendance.find(query).sort({ date: -1, empID: 1 });
  }
  
  /**
   * Get attendance records for an employee within a date range with role-based filtering
   */
  async getEmployeeAttendance(
    empID: string, 
    startDate: string, 
    endDate: string,
    userRole?: string,
    userEmpID?: string,
    userDepartment?: string
  ): Promise<IAttendance[]> {
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');
    
    let query: any = {
      empID: empID,
      date: {
        $gte: start,
        $lte: end
      }
    };

    // Role-based access control for the requested employee
    if (userRole && userEmpID) {
      if (userRole === 'admin' || userRole === 'hr') {
        // HR and admin can access any employee's data - no additional filter needed
      } else if (userRole === 'manager') {
        // Manager can only access employees in their department or themselves
        if (userDepartment) {
          // First check if the requested employee is in the same department
          const targetEmployee = await Employee.findOne({ empID: empID });
          if (!targetEmployee || (targetEmployee.department !== userDepartment && empID !== userEmpID)) {
            // If target employee is not in manager's department and not the manager themselves, return empty
            return [];
          }
        } else {
          // Manager with no department can only access their own data
          if (empID !== userEmpID) {
            return [];
          }
        }
      } else {
        // Employee can only access their own data
        if (empID !== userEmpID) {
          return [];
        }
      }
    }
    
    return Attendance.find(query).sort({ date: -1 });
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
      .filter(r => r.workDuration)
      .reduce((sum, r) => sum + (r.workDuration || 0) / 60, 0);
    const averageWorkHours = records.length > 0 ? totalWorkHours / records.length : 0;
    
    return {
      totalEmployees,
      presentEmployees,
      absentEmployees,
      lateEmployees,
      averageWorkHours
    };
  }

  calcWorkDuration(inTime: Date, outTime: Date): {
    duration: number, // minute
    lateMinute: number,
    pastLunchBreak: boolean,
    isLate: boolean,
    isEarlyLeave: boolean
  } {
    // Transform to dayjs with Taipei timezone
    const inTimeDayjs = dayjs(inTime).tz('Asia/Taipei');
    const outTimeDayjs = dayjs(outTime).tz('Asia/Taipei');
    
    // Define standard times
    const standardStart = inTimeDayjs.clone().hour(8).minute(30).second(0);
    const standardEnd = inTimeDayjs.clone().hour(17).minute(20).second(0);
    const lunchStart = inTimeDayjs.clone().hour(12).minute(0).second(0);
    const lunchEnd = inTimeDayjs.clone().hour(13).minute(0).second(0);
    const flexibleStart = inTimeDayjs.clone().hour(9).minute(30).second(0);
    
    // Check if late (after 08:30)
    let isLate = inTimeDayjs.isAfter(standardStart);
    
    // Check if early leave (before 17:20)
    const isEarlyLeave = outTimeDayjs.isBefore(standardEnd);
    
    // Check if past lunch break (in before 12:00 and out after 13:00)
    const pastLunchBreak = inTimeDayjs.isBefore(lunchStart) && outTimeDayjs.isAfter(lunchEnd);
    
    // Calculate duration in minutes
    let duration = outTimeDayjs.diff(inTimeDayjs, 'minute');
    
    // Subtract lunch break if applicable
    if (pastLunchBreak) {
      duration -= 60;
    }
    
    // If duration > 470 minutes (7h 50m) and in before 09:30, not considered late
    if (duration >= 470 && inTimeDayjs.isBefore(flexibleStart)) {
      isLate = false;
    }
    
    // Calculate late minutes
    // lateMinute = (inTime - 08:30) - (outTime - 18:20)
    const inLateMinutes = Math.max(0, inTimeDayjs.diff(standardStart, 'minute'));
    const outEarlyMinutes = Math.max(0, standardEnd.diff(outTimeDayjs, 'minute'));
    let lateMinute = inLateMinutes - outEarlyMinutes;
    
    if (lateMinute < 0) {
      lateMinute = 0;
    }
    
    return {
      duration,
      lateMinute,
      pastLunchBreak,
      isLate,
      isEarlyLeave
    };
  }
}

export const attendanceService = new AttendanceService();