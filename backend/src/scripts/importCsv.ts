import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Employee } from '../models/Employee';
import connectDB from '../config/database';

interface CsvRow {
  name: string;
  id: string;
  empID: string;
}

const importEmployeeData = async () => {
  const csvFilePath = path.join(__dirname, '../../../data/Employee.csv');
  const employees: CsvRow[] = [];

  console.log('Starting CSV import process...');
  console.log(`Reading from: ${csvFilePath}`);

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row: CsvRow) => {
        // Skip rows with empty empID or invalid data
        if (row.empID && row.empID.trim() && row.name && row.name.trim()) {
          employees.push({
            name: row.name.trim(),
            id: row.id.trim(),
            empID: row.empID.trim()
          });
        }
      })
      .on('end', async () => {
        console.log(`Parsed ${employees.length} valid employees from CSV`);
        
        try {
          let imported = 0;
          let skipped = 0;
          
          for (const emp of employees) {
            try {
              // Check if employee already exists
              const existing = await Employee.findOne({ 
                $or: [
                  { empID: emp.empID },
                  { empID2: emp.id }
                ]
              });

              if (existing) {
                console.log(`Skipping ${emp.name} (${emp.empID}) - already exists`);
                skipped++;
                continue;
              }

              // Create new employee with simplified schema
              const newEmployee = new Employee({
                name: emp.name,
                empID: emp.empID,
                empID2: emp.id, // Original ID from CSV
                department: 'Unknown', // Default department
                isActive: true,
                role: 'employee'
              });

              await newEmployee.save();
              console.log(`Imported: ${emp.name} (${emp.empID})`);
              imported++;
              
            } catch (error) {
              console.error(`Error importing ${emp.name} (${emp.empID}):`, error);
            }
          }
          
          console.log(`\nImport completed:`);
          console.log(`- Imported: ${imported} employees`);
          console.log(`- Skipped: ${skipped} employees`);
          
          resolve();
          
        } catch (error) {
          console.error('Error during import:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      });
  });
};

// Run the import if this script is executed directly
if (require.main === module) {
  // First connect to database
  connectDB()
    .then(() => {
      console.log('Database connected, starting import...');
      return importEmployeeData();
    })
    .then(() => {
      console.log('Import process finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import process failed:', error);
      process.exit(1);
    });
}

export { importEmployeeData };