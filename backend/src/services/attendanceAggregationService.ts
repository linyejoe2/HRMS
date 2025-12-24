import { Attendance, Employee, Leave, BusinessTrip, PostClock } from '../models';
import { holidayService } from './holidayService';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export class AttendanceAggregationService {
  /**
   * Get aggregated attendance data for a date range
   * Returns separate data sets for attendance, leave, business trip, post clock, and holidays
   */
  async getAggregatedAttendance(
    startDateStr: string,
    endDateStr: string,
    userRole: string,
    userEmpID: string,
    userCardID?: string,
    userDepartment?: string
  ) {
    const startDate = dayjs.tz(startDateStr, 'Asia/Taipei').startOf('day').toDate();
    const endDate = dayjs.tz(endDateStr, 'Asia/Taipei').endOf('day').toDate();

    // Step 1: Check role and build employee filter
    let employeeFilter: any = { isActive: true };

    if (userRole === 'admin' || userRole === 'hr') {
      // HR and admin can see everyone - no filter
    } else if (userRole === 'manager') {
      // Manager can see their department
      if (userDepartment) {
        employeeFilter.department = userDepartment;
      } else {
        // If manager has no department, only see themselves
        employeeFilter.empID = userEmpID;
      }
    } else {
      // Employee can only see themselves
      employeeFilter.empID = userEmpID;
    }

    // Get allowed employees based on permission
    const employees = await Employee.find(employeeFilter);
    const allowedEmpIDs = employees.map(e => e.empID);
    const allowedCardIDs = employees.map(e => e.cardID);

    // Step 2: Fetch all data with date range and permission filters
    const [attendanceRecords, holidays, leaves, businessTrips, postClocks] = await Promise.all([
      Attendance.find({
        cardID: { $in: allowedCardIDs },
        date: { $gte: startDate, $lte: endDate }
      }),
      holidayService.getHolidaysByDateRange(startDateStr, endDateStr),
      Leave.find({
        empID: { $in: allowedEmpIDs },
        leaveStart: { $lte: endDate },
        leaveEnd: { $gte: startDate },
        status: 'approved'
      }),
      BusinessTrip.find({
        empID: { $in: allowedEmpIDs },
        tripStart: { $lte: endDate },
        tripEnd: { $gte: startDate },
        status: 'approved'
      }),
      PostClock.find({
        empID: { $in: allowedEmpIDs },
        date: { $gte: startDate, $lte: endDate },
        status: 'approved'
      })
    ]);

    // Step 3: Combine and send response
    return {
      startDate: startDateStr,
      endDate: endDateStr,
      attendance: {
        count: attendanceRecords.length,
        records: attendanceRecords
      },
      leave: {
        count: leaves.length,
        records: leaves
      },
      businesstrip: {
        count: businessTrips.length,
        records: businessTrips
      },
      holiday: {
        count: holidays.length,
        records: holidays
      },
      postclock: {
        count: postClocks.length,
        records: postClocks
      }
    };
  }
}

export const attendanceAggregationService = new AttendanceAggregationService();
