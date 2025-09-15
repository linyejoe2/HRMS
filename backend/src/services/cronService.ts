import * as cron from 'node-cron';
import { fileScanService } from './fileScanService';

export class CronService {
  private scanJob: cron.ScheduledTask | null = null;

  private isScanning = false;

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
    }, {
      timezone: 'Asia/Taipei'
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
  } {
    return {
      fileScanning: {
        isRunning: this.isFileScanningRunning(),
        schedule: 'Every 5 minutes (*/5 * * * *)'
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
}

export const cronService = new CronService();