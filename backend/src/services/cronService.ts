import * as cron from 'node-cron';
import { fileScanService } from './fileScanService';
import { Employee } from '../models/Employee';
import { Attendance } from '../models/Attendance';
import { cardAssignmentService } from './cardAssignmentService';
import dayjs from 'dayjs';

export class CronService {
  private attendanceFileScanJob: cron.ScheduledTask | null = null;
  private createAttendanceJob: cron.ScheduledTask | null = null;

  private isScanning = false;
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
  } {
    return {
      fileScanning: {
        isRunning: this.isFileScanningRunning(),
        schedule: 'Every 10 minutes (*/10 * * * *)'
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

  async createAttendance(date?: Date): Promise<{
    date: Date;
    employeeCount: number;
    createdCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let createdCount = 0;

    try {
      // Get current date (set to start of day for consistency)
      const today = date ? new Date(date) : new Date();
      today.setHours(0, 0, 0, 0);

      // Check if today is a weekend (Saturday = 6, Sunday = 0)
      const dayOfWeek = today.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log(`⏭️  Skipping attendance creation - Today is ${dayOfWeek === 0 ? 'Sunday' : 'Saturday'} (holiday)`);
        return {
          date: today,
          employeeCount: 0,
          createdCount: 0,
          errors: ['Skipped: Weekend/Holiday']
        };
      }

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
            // Use CardAssignment for snapshot if available, fallback to Employee
            let empID = employee.empID;
            let employeeName = employee.name;

            if (employee.cardID) {
              const assignment = await cardAssignmentService.getActiveAssignment(employee.cardID);
              if (assignment) {
                const assignedEmp = await Employee.findById(assignment.employeeId);
                if (assignedEmp) {
                  empID = assignedEmp.empID;
                  employeeName = assignedEmp.name;
                }
              }
            }

            // Create new attendance record
            const attendance = new Attendance({
              empID,
              cardID: employee.cardID,
              employeeName,
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
   * Run attendance creation immediately (manual trigger)
   */
  async runCreateAttendanceNow(date: Date): Promise<{
    date: Date;
    employeeCount: number;
    createdCount: number;
    errors: string[];
  }> {
    console.log('🔄 Manual attendance creation triggered...');
    const result = await this.createAttendance(date);
    console.log(`✅ Manual attendance creation completed - Created ${result.createdCount} records for ${result.employeeCount} employees`);
    return result;
  }
}

export const cronService = new CronService();