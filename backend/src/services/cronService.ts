import * as cron from 'node-cron';
import { fileScanService } from './fileScanService';
import { Leave } from '../models/Leave';
import { Employee } from '../models/Employee';
import { calcWarkingDurent } from '../utility';

export class CronService {
  private scanJob: cron.ScheduledTask | null = null;
  private sickLeaveJob: cron.ScheduledTask | null = null;

  private isScanning = false;
  private isUpdatingSickLeave = false;

  startTestCronJob(): void {
    cron.schedule('* * * * *', () => {
      console.log(`[${new Date().toISOString()}] cron executed`);
    });
  }

  /**
   * Start the automated file scanning cron job
   * Runs every 5 minutes
   */
  startFileScanning(): void {
    if (this.scanJob) {
      console.log('File scanning cron job is already running');
      return;
    }

    // Run every 5 minutes: */5 * * * *
    this.scanJob = cron.schedule('*/5 * * * *', async () => {
      if (this.isScanning) {
        console.warn('⏳ Skipping file scan - previous job still running');
        return;
      }

      this.isScanning = true;

      console.log('🔄 Starting automated attendance file scan...');
      
      try {
        const result = await fileScanService.scanDataFolder();
        console.log(`✅ File scan completed - Processed: ${result.processed}, Updated: ${result.updated}`);
        
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

    this.scanJob.start();
    console.log('🤖 Automated file scanning started - runs every 5 minutes');
  }

  /**
   * Stop the automated file scanning cron job
   */
  stopFileScanning(): void {
    if (this.scanJob) {
      this.scanJob.stop();
      this.scanJob = null;
      console.log('🛑 Automated file scanning stopped');
    } else {
      console.log('File scanning cron job is not running');
    }
  }

  /**
   * Check if the file scanning job is running
   */
  isFileScanningRunning(): boolean {
    return this.scanJob !== null;
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
        schedule: 'Every 5 minutes (*/5 * * * *)'
      },
      leaveTracking: {
        isRunning: this.isLeaveTrackingRunning(),
        schedule: 'Daily at midnight (0 0 * * *)'
      }
    };
  }

  /**
   * Run file scan immediately (manual trigger)
   */
  async runFileScanNow(): Promise<{
    processed: number;
    updated: number;
    imported: number;
    errors: string[];
  }> {
    console.log('🔄 Manual file scan triggered...');
    const result = await fileScanService.scanDataFolder();
    console.log(`✅ Manual scan completed - Processed: ${result.processed}, Updated: ${result.updated}`);
    return result;
  }

  /**
   * Start the leave tracking cron job
   * Runs daily at 00:00
   */
  startLeaveTracking(): void {
    if (this.sickLeaveJob) {
      console.log('Leave tracking cron job is already running');
      return;
    }

    // Run daily at midnight: 0 0 * * *
    this.sickLeaveJob = cron.schedule('0 0 * * *', async () => {
      if (this.isUpdatingSickLeave) {
        console.warn('⏳ Skipping leave tracking update - previous job still running');
        return;
      }

      this.isUpdatingSickLeave = true;

      console.log('🔄 Starting leave tracking update...');

      try {
        const result = await this.updateLeaveTracking();
        console.log(`✅ Leave tracking completed - Updated ${result.updatedLeaves} leaves, ${result.updatedEmployees} employees`);

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

    this.sickLeaveJob.start();
    console.log('🤖 Leave tracking started - runs daily at midnight');
  }

  /**
   * Stop the leave tracking cron job
   */
  stopLeaveTracking(): void {
    if (this.sickLeaveJob) {
      this.sickLeaveJob.stop();
      this.sickLeaveJob = null;
      console.log('🛑 Leave tracking stopped');
    } else {
      console.log('Leave tracking cron job is not running');
    }
  }

  /**
   * Check if the leave tracking job is running
   */
  isLeaveTrackingRunning(): boolean {
    return this.sickLeaveJob !== null;
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
}

export const cronService = new CronService();