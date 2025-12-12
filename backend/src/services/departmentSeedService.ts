import { Department } from '../models/Department';

interface DepartmentData {
  name: string;
  code: string;
}

const INITIAL_DEPARTMENTS: DepartmentData[] = [
  { name: '管理部', code: '2000' },
  { name: '財務部', code: '8000' },
  { name: '研發課', code: '5006' },
  { name: '業務部', code: '4200' },
  { name: '稽核室', code: '1700' },
  { name: '總經理室', code: '1300' }
];

export class DepartmentSeedService {
  /**
   * Initialize departments on server startup
   * Creates departments if they don't exist
   */
  async initializeDepartments(): Promise<void> {
    try {
      console.log('🏢 Initializing departments...');

      let createdCount = 0;
      let existingCount = 0;

      for (const deptData of INITIAL_DEPARTMENTS) {
        // Check if department already exists by code
        const existingDept = await Department.findOne({ code: deptData.code });

        if (!existingDept) {
          // Create new department
          await Department.create({
            name: deptData.name,
            code: deptData.code,
            isActive: true
          });
          createdCount++;
          console.log(`  ✅ Created department: ${deptData.name} (${deptData.code})`);
        } else {
          existingCount++;
          // Optionally update the name if it changed (uncomment if needed)
          // if (existingDept.name !== deptData.name) {
          //   existingDept.name = deptData.name;
          //   await existingDept.save();
          //   console.log(`  🔄 Updated department: ${deptData.name} (${deptData.code})`);
          // }
        }
      }

      console.log(`🏢 Department initialization complete: ${createdCount} created, ${existingCount} existing`);

    } catch (error) {
      console.error('❌ Error initializing departments:', error);
      // Don't throw - allow server to continue even if seeding fails
    }
  }
}

export const departmentSeedService = new DepartmentSeedService();
