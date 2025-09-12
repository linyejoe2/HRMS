import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { Employee } from '../models';
import { APIError } from '../middleware';

let ADODB: any;
try {
  // Try to import node-adodb only if available (Windows platform)
  ADODB = require('node-adodb');
} catch (error) {
  console.log('node-adodb not available - Access DB migration disabled');
  ADODB = null;
}

export class MigrationService {
  private connection: any;
  private isAccessDbAvailable: boolean = false;

  constructor() {
    if (ADODB && process.platform === 'win32') {
      try {
        const dbPath = path.join(__dirname, '..', '..', '..', 'data', 'PGA.mdb');
        this.connection = ADODB.open(`Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${dbPath};`);
        this.isAccessDbAvailable = true;
      } catch (error) {
        console.warn('Access database connection failed:', error);
      }
    }
  }

  async migrateEmployeesFromAccess(): Promise<{ migrated: number; errors: string[] }> {
    if (!this.isAccessDbAvailable) {
      throw new APIError(
        'Access database migration not available on this platform. Please use CSV or Excel import instead.',
        400
      );
    }

    try {
      console.log('Starting Access database migration...');
      
      // Query Access database
      const accessData = await this.connection.query('SELECT * FROM Employee') as any[];
      console.log(`Found ${accessData.length} employees in Access database`);

      let migrated = 0;
      const errors: string[] = [];

      for (const accessEmployee of accessData) {
        try {
          // Check if employee already exists
          const existingEmployee = await Employee.findOne({ 
            $or: [
              { empID: accessEmployee.EmpID },
              { id: accessEmployee.ID }
            ]
          });

          if (existingEmployee) {
            console.log(`Employee ${accessEmployee.EmpID} already exists, skipping...`);
            continue;
          }

          // Map Access database fields to MongoDB schema
          const employeeData = {
            name: accessEmployee.Name || '',
            id: accessEmployee.ID || '',
            empID: accessEmployee.EmpID || '',
            department: accessEmployee.Department || 'Unknown',
            photoPath: accessEmployee.PhotoPath || null,
            carNo: accessEmployee.CarNo || null,
            carPosition: accessEmployee.CarPosition || null,
            address: accessEmployee.Address || null,
            startDate: this.parseDate(accessEmployee.Startdate) || new Date(),
            enableDate: this.parseDate(accessEmployee.EnableDate) || new Date(),
            disableDate: accessEmployee.EisableDate ? this.parseDate(accessEmployee.EisableDate) : undefined,
            classID: accessEmployee.ClassID || '',
            
            // Default values for new fields
            isActive: !accessEmployee.EisableDate, // Active if no disable date
            role: 'employee' as const,
            
            // No password initially - employees need to register
            password: undefined,
            email: undefined
          };

          // Create new employee
          const newEmployee = new Employee(employeeData);
          await newEmployee.save();
          
          migrated++;
          console.log(`Migrated employee: ${employeeData.empID} - ${employeeData.name}`);
          
        } catch (error) {
          const errorMsg = `Failed to migrate employee ${accessEmployee.EmpID}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`Migration completed. Migrated: ${migrated}, Errors: ${errors.length}`);
      return { migrated, errors };
      
    } catch (error) {
      console.error('Migration failed:', error);
      throw new APIError(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  private parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;
    
    // Try different date parsing approaches
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    if (typeof dateValue === 'number') {
      // Might be a timestamp
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    return null;
  }

  async getAccessEmployeeCount(): Promise<number> {
    if (!this.isAccessDbAvailable) {
      console.log('Access database not available - returning 0');
      return 0;
    }
    
    try {
      const result = await this.connection.query('SELECT COUNT(*) as count FROM Employee') as any[];
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting Access employee count:', error);
      return 0;
    }
  }

  async testAccessConnection(): Promise<boolean> {
    if (!this.isAccessDbAvailable) {
      console.log('Access database not available on this platform');
      return false;
    }
    
    try {
      await this.connection.query('SELECT TOP 1 * FROM Employee');
      return true;
    } catch (error) {
      console.error('Access database connection test failed:', error);
      return false;
    }
  }

  // Alternative migration methods for CSV/Excel (keeping logic for future use)
  async migrateFromCSV(filePath: string): Promise<{ migrated: number; errors: string[] }> {
    console.log('CSV migration method available but not implemented yet');
    return { migrated: 0, errors: ['CSV migration not implemented'] };
  }

  async migrateFromExcel(filePath: string): Promise<{ migrated: number; errors: string[] }> {
    console.log('Excel migration method available but not implemented yet');
    return { migrated: 0, errors: ['Excel migration not implemented'] };
  }
}

export const migrationService = new MigrationService();