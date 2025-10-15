import * as cron from 'node-cron';
import { fileScanService } from './fileScanService';
import { Leave } from '../models/Leave';
import { Employee } from '../models/Employee';
import { Attendance } from '../models/Attendance';
import { calcWarkingDurent } from '../utility';
import dayjs from 'dayjs';

export class CronService {
  private attendanceFileScanJob: cron.ScheduledTask | null = null;
  private createAttendanceJob: cron.ScheduledTask | null = null;
  private leaveDaysTrackingJob: cron.ScheduledTask | null = null;

  private isScanning = false;
  private isUpdatingSickLeave = false;
  private isAutoCreateAttendance = false;

  /**
   * Start the automated file scanning cron job
   * Runs every 5 minutes
   */
  startFileScanning(): void {
    // console.log('File scanning cron job start running');

    // this.attendanceFileScanJob = cron.schedule('*/5 * * * *', async () => {
      
    //     console.warn('⏳ Skipping file scan - test');
    // })
    // return;

    if (this.attendanceFileScanJob) {
      console.log('attendanceFileScanJob is already running');
      return;
    }

    // Run every 5 minutes: */5 * * * *
    this.attendanceFileScanJob = cron.schedule('*/30 * * * *', async () => {
      if (this.isScanning) {
        console.warn('⏳ Skipping file scan - previous job still running');
        return;
      }

      this.isScanning = true;
      const startTime = Date.now();

      console.log('▶️ Starting attendanceFileScanJob  at ', dayjs(startTime).locale("tw").format('YYYY/MM/DD HH:mm'))

      try {
        const result = await fileScanService.scanDataFolder();
        const duration = Date.now() - startTime;
        console.log(`✅ File scan completed in ${duration}ms - Processed: ${result.processed}, Updated: ${result.updated}`);

        if (result.errors.length > 0) {
          console.log(`⚠️  Scan completed with ${result.errors.length} errors:`);
          result.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
          });
        }
      } catch (error) {
        console.error('❌ Error during automated file scan:', error);
      } finally {
        this.isScanning = false;
      }
    });

    this.attendanceFileScanJob!.start();
    console.log('🤖 Automated file scanning started - runs every 5 minutes');
  }

  /**
   * Stop the automated file scanning cron job
   */
  stopFileScanning(): void {
    if (this.attendanceFileScanJob) {
      this.attendanceFileScanJob.stop();
      this.attendanceFileScanJob = null;
      console.log('🛑 Automated file scanning stopped');
    } else {
      console.log('File scanning cron job is not running');
    }
  }

  /**
   * Check if the file scanning job is running
   */
  isFileScanningRunning(): boolean {
    return this.attendanceFileScanJob !== null;
  }

  /**
   * Get the status of all cron jobs
   */
  getStatus(): {
    fileScanning: {
      isRunning: boolean;
      schedule: string;
    };
    leaveTracking: {
      isRunning: boolean;
      schedule: string;
    };
  } {
    return {
      fileScanning: {
        isRunning: this.isFileScanningRunning(),
        schedule: 'Every 10 minutes (*/10 * * * *)'
      },
      leaveTracking: {
        isRunning: this.isLeaveTrackingRunning(),
        schedule: 'Daily at midnight (0 0 * * *)'
      }
    };
  }

  /**
   * Start auto attendance data creation job
   * Running every day at 01:00 AM
   */
  startAutoCreateAttendance(): void {
    if (this.createAttendanceJob) {
      console.warn('Auto Create Attendance job is already running.');
      return;
    }

    this.createAttendanceJob = cron.schedule('0 1 * * *', async () => {
      if (this.isAutoCreateAttendance) {
        console.warn('⏳ Skipping file scan - previous job still running');
        return;
      }

      this.isAutoCreateAttendance = true;
      const startTime = Date.now();

      console.log('▶️ Starting createAttendanceJob at ', dayjs(startTime).locale("tw").format('YYYY/MM/DD HH:mm'));

      try {
        await this.createAttendance()
      } catch (error) {
        console.error('❌ Error during automated file scan:', error);
      } finally {
        this.isAutoCreateAttendance = false;
      }
    });

    this.createAttendanceJob!.start();
    console.log('🤖 Automated file scanning started - runs every 5 minutes');
  }

  async createAttendance(): Promise<{
    date: Date;
    employeeCount: number;
    createdCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let createdCount = 0;

    try {
      // Get current date (set to start of day for consistency)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all active employees
      const employees = await Employee.find({ isActive: true });
      const employeeCount = employees.length;

      // Process each employee
      for (const employee of employees) {
        try {
          // Check if attendance record already exists for this employee and date
          const existingAttendance = await Attendance.findOne({
            cardID: employee.cardID,
            date: today
          });

          if (!existingAttendance) {
            // Create new attendance record
            const attendance = new Attendance({
              empID: employee.empID,
              cardID: employee.cardID,
              employeeName: employee.name,
              department: employee.department,
              date: today,
              isAbsent: true // Default to absent until clock-in data is processed
            });

            await attendance.save();
            createdCount++;
          }
        } catch (error) {
          errors.push(`Error creating attendance for employee ${employee.empID} (${employee.name}): ${error}`);
        }
      }

      console.log(`✅ Created ${createdCount} attendance records out of ${employeeCount} employees`);

      return {
        date: today,
        employeeCount,
        createdCount,
        errors
      };
    } catch (error) {
      errors.push(`General error in createAttendance: ${error}`);
      return {
        date: new Date(),
        employeeCount: 0,
        createdCount,
        errors
      };
    }
  }

  /**
   * Start the leave tracking cron job
   * Runs daily at 00:00
   */
  startLeaveTracking(): void {
    if (this.leaveDaysTrackingJob) {
      console.log('Leave tracking cron job is already running');
      return;
    }

    // Run daily at midnight: 0 0 * * *
    this.leaveDaysTrackingJob = cron.schedule('0 0 * * *', async () => {
      if (this.isUpdatingSickLeave) {
        console.warn('⏳ Skipping leave tracking update - previous job still running');
        return;
      }

      this.isUpdatingSickLeave = true;
      const startTime = Date.now();

      console.log('▶️ Starting leaveDaysTrackingJob at ', dayjs(startTime).locale("tw").format('YYYY/MM/DD HH:mm'));

      try {
        const result = await this.updateLeaveTracking();
        const duration = Date.now() - startTime;
        console.log(`✅ Leave tracking completed in ${duration}ms - Updated ${result.updatedLeaves} leaves, ${result.updatedEmployees} employees`);

        if (result.errors.length > 0) {
          console.log(`⚠️  Update completed with ${result.errors.length} errors:`);
          result.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
          });
        }
      } catch (error) {
        console.error('❌ Error during leave tracking update:', error);
      } finally {
        this.isUpdatingSickLeave = false;
      }
    });

    this.leaveDaysTrackingJob.start();
    console.log('🤖 Leave tracking started - runs daily at midnight');
  }

  /**
   * Stop the leave tracking cron job
   */
  stopLeaveTracking(): void {
    if (this.leaveDaysTrackingJob) {
      this.leaveDaysTrackingJob.stop();
      this.leaveDaysTrackingJob = null;
      console.log('🛑 Leave tracking stopped');
    } else {
      console.log('Leave tracking cron job is not running');
    }
  }

  /**
   * Check if the leave tracking job is running
   */
  isLeaveTrackingRunning(): boolean {
    return this.leaveDaysTrackingJob !== null;
  }

  /**
   * Update leave tracking for all employees
   * This method processes all leaves and updates employee counters based on leave age
   */
  private async updateLeaveTracking(): Promise<{
    updatedLeaves: number;
    updatedEmployees: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let updatedLeaves = 0;
    let updatedEmployees = 0;

    try {
      // Find all leaves that need age tracking update (pastYear < 3)
      const leavesToUpdate = await Leave.find({
        status: 'approved',
        pastYear: { $lt: 3 }
      });

      const today = new Date();
      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
      const threeYearsAgo = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());

      // Group leaves by employee for batch processing
      const employeeLeaves = new Map<string, typeof leavesToUpdate>();

      for (const leave of leavesToUpdate) {
        try {
          const leaveStartDate = new Date(leave.leaveStart);
          let shouldUpdate = false;
          let newPastYear = leave.pastYear;

          // Calculate leave days
          const timeDiff = calcWarkingDurent(leave.leaveStart.toISOString(), leave.leaveEnd.toISOString());
          const leaveDays = Math.ceil(timeDiff.durent / (8 * 60));

          // Check if leave has aged
          if (leaveStartDate < threeYearsAgo && leave.pastYear < 3) {
            // Move to 3+ years old
            newPastYear = 3;
            shouldUpdate = true;
          } else if (leaveStartDate < twoYearsAgo && leave.pastYear < 2) {
            // Move to 2 years old
            newPastYear = 2;
            shouldUpdate = true;
          } else if (leaveStartDate < oneYearAgo && leave.pastYear < 1) {
            // Move to 1 year old
            newPastYear = 1;
            shouldUpdate = true;
          }

          if (shouldUpdate) {
            // Update leave pastYear
            leave.pastYear = newPastYear;
            await leave.save();
            updatedLeaves++;

            // Group by employee for employee counter updates
            if (!employeeLeaves.has(leave.empID)) {
              employeeLeaves.set(leave.empID, []);
            }
            employeeLeaves.get(leave.empID)!.push(leave);
          }
        } catch (error) {
          errors.push(`Error processing leave ${leave._id}: ${error}`);
        }
      }

      // Update employee counters
      for (const [empID, leaves] of employeeLeaves) {
        try {
          const employee = await Employee.findOne({ empID, isActive: true });
          if (!employee) {
            errors.push(`Employee ${empID} not found`);
            continue;
          }

          for (const leave of leaves) {
            // Only update employee counters for sick leave types
            if (leave.leaveType === '普通傷病假' || leave.leaveType === '普通傷病假(住院)') {
              const timeDiff = calcWarkingDurent(leave.leaveStart.toISOString(), leave.leaveEnd.toISOString());
              const leaveDays = Math.ceil(timeDiff.durent / (8 * 60));

              if (leave.pastYear === 1) {
                // Move from current year to past year
                if (leave.leaveType === '普通傷病假') {
                  employee.sickLeaveDaysInThePastYear -= leaveDays;
                  employee.sickLeaveDaysInThePastTwoYear += leaveDays;
                } else if (leave.leaveType === '普通傷病假(住院)') {
                  employee.sickLeaveDaysInHospitalInThePastYear -= leaveDays;
                  employee.sickLeaveDaysInThePastTwoYear += leaveDays;
                }
              } else if (leave.pastYear === 2) {
                // Move from 1-2 years to 2+ years
                employee.sickLeaveDaysInThePastTwoYear -= leaveDays;
                employee.sickLeaveDaysPriorToThePastTwoYear += leaveDays;
              }
            }
          }

          await employee.save();
          updatedEmployees++;
        } catch (error) {
          errors.push(`Error updating employee ${empID}: ${error}`);
        }
      }

      return { updatedLeaves, updatedEmployees, errors };
    } catch (error) {
      errors.push(`General error in sick leave tracking: ${error}`);
      return { updatedLeaves, updatedEmployees, errors };
    }
  }

  /**
   * Run leave tracking update immediately (manual trigger)
   */
  async runLeaveTrackingNow(): Promise<{
    updatedLeaves: number;
    updatedEmployees: number;
    errors: string[];
  }> {
    console.log('🔄 Manual leave tracking triggered...');
    const result = await this.updateLeaveTracking();
    console.log(`✅ Manual leave tracking completed - Updated ${result.updatedLeaves} leaves, ${result.updatedEmployees} employees`);
    return result;
  }

  /**
   * Run attendance creation immediately (manual trigger)
   */
  async runCreateAttendanceNow(): Promise<{
    date: Date;
    employeeCount: number;
    createdCount: number;
    errors: string[];
  }> {
    console.log('🔄 Manual attendance creation triggered...');
    const result = await this.createAttendance();
    console.log(`✅ Manual attendance creation completed - Created ${result.createdCount} records for ${result.employeeCount} employees`);
    return result;
  }
}

export const cronService = new CronService();