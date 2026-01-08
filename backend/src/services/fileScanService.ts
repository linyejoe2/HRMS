import fs from 'fs';
import path from 'path';
import { AttendanceFile, IAttendanceFile } from '../models';
import { attendanceService } from './attendanceService';

export class FileScanService {
  private dataFolderPath: string = './data';

  /**
   * Scan the data folder for files ending with 'saveData.txt'
   */
  async scanDataFolder(): Promise<{
    processed: number;
    updated: number;
    imported: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;
    let updated = 0;
    let imported = 0;

    try {
      if (!fs.existsSync(this.dataFolderPath)) {
        console.log(`Data folder ${this.dataFolderPath} does not exist, creating it...`);
        fs.mkdirSync(this.dataFolderPath, { recursive: true });
        return { processed, updated, imported, errors };
      }

      let files = fs.readdirSync(this.dataFolderPath);
      // files = files.filter(file => file.endsWith('saveData.txt'));
      // files = files.filter(file => file.startsWith('001'));
      // files = files.filter(file => file.includes('2025'));
      files = files.filter(file => {
        // 1. 基本過濾：必須以 saveData.txt 結尾
        if (!file.endsWith('saveData.txt')) {
          return false;
        }

        // 2. 提取年份：使用正則表達式尋找 4 位數字
        // \d{4} 代表比對連續四個數字
        const match = file.match(/\d{4}/);

        if (match) {
          const year = parseInt(match[0], 10);
          // 3. 條件判斷：年份必須大於 2025
          return year > 2025;
        }

        return false;
      });

      console.log(`Found ${files.length} saveData.txt files`);

      for (const fileName of files) {
        try {
          const filePath = path.join(this.dataFolderPath, fileName);
          const stats = fs.statSync(filePath);

          const fileInfo = {
            name: fileName,
            updateDate: stats.mtime.toISOString(),
            fileSize: stats.size.toString()
          };

          // Check if file exists in database
          let attendanceFile = await AttendanceFile.findOne({ name: fileName });

          if (!attendanceFile) {
            // New file - create record and process
            attendanceFile = new AttendanceFile(fileInfo);
            await attendanceFile.save();

            // Process the file
            const result = await attendanceService.importSaveDataFile(filePath);
            attendanceFile.lastProcessed = new Date();
            attendanceFile.processedRecords = result.imported;
            await attendanceFile.save();

            console.log(`Processed new file ${fileName}: ${result.imported} records imported`);
            if (result.errors.length > 0) {
              errors.push(...result.errors);
            }

            imported += result.imported;
            processed++;
            updated++;
          } else {
            // Existing file - check if it has been updated
            if (attendanceFile.updateDate !== fileInfo.updateDate ||
              attendanceFile.fileSize !== fileInfo.fileSize) {

              // File has been updated - update record and reprocess
              attendanceFile.updateDate = fileInfo.updateDate;
              attendanceFile.fileSize = fileInfo.fileSize;

              const result = await attendanceService.importSaveDataFile(filePath);
              attendanceFile.lastProcessed = new Date();
              attendanceFile.processedRecords = result.imported;
              await attendanceFile.save();

              console.log(`Reprocessed updated file ${fileName}: ${result.imported} records imported`);
              if (result.errors.length > 0) {
                errors.push(...result.errors);
              }

              processed++;
              updated++;
            } else {
              // console.log(`File ${fileName} unchanged, skipping`);
              processed++;
            }
          }
        } catch (error) {
          const errorMsg = `Error processing file ${fileName}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      return { processed, updated, imported, errors };

    } catch (error) {
      const errorMsg = `Error scanning data folder: ${error}`;
      errors.push(errorMsg);
      console.error(errorMsg);
      return { processed, updated, imported, errors };
    }
  }

  /**
   * Get all tracked attendance files
   */
  async getTrackedFiles(): Promise<IAttendanceFile[]> {
    return AttendanceFile.find().sort({ updatedAt: -1 });
  }

  /**
   * Get file statistics
   */
  async getFileStats(): Promise<{
    totalFiles: number;
    totalProcessedRecords: number;
    lastScanTime?: Date;
  }> {
    const files = await AttendanceFile.find();
    const totalFiles = files.length;
    const totalProcessedRecords = files.reduce((sum, file) => sum + (file.processedRecords || 0), 0);
    const lastScanTime = files.length > 0 ?
      files.reduce((latest, file) =>
        !latest || file.updatedAt > latest ? file.updatedAt : latest,
        undefined as Date | undefined
      ) : undefined;

    return {
      totalFiles,
      totalProcessedRecords,
      lastScanTime
    };
  }
}

export const fileScanService = new FileScanService();