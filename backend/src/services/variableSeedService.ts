import { Variable } from '../models';

export class VariableSeedService {
  /**
   * Seed initial variable data
   */
  async seedVariables(): Promise<void> {
    try {
      // Check if variables already exist
      const existingCount = await Variable.countDocuments();
      if (existingCount > 0) {
        console.log(`Variables already seeded (${existingCount} records exist)`);
        return;
      }

      const variables = [
        // Job Types (職別)
        { section: 'jobType', code: '01', description: '董事長', isActive: true },
        { section: 'jobType', code: '02', description: '總經理', isActive: true },
        { section: 'jobType', code: '03', description: '副總經理', isActive: true },
        { section: 'jobType', code: '04', description: '經理', isActive: true },
        { section: 'jobType', code: '05', description: '副理', isActive: true },
        { section: 'jobType', code: '06', description: '課長', isActive: true },
        { section: 'jobType', code: '07', description: '組長', isActive: true },
        { section: 'jobType', code: '08', description: '專員', isActive: true },
        { section: 'jobType', code: '09', description: '助理', isActive: true },
        { section: 'jobType', code: '10', description: '工程師', isActive: true },
        { section: 'jobType', code: '11', description: '資深工程師', isActive: true },
        { section: 'jobType', code: '12', description: '技術員', isActive: true },
        { section: 'jobType', code: '13', description: '作業員', isActive: true },

        // Job Levels (職等)
        { section: 'jobLevel', code: '01', description: '特級', isActive: true },
        { section: 'jobLevel', code: '02', description: '一級', isActive: true },
        { section: 'jobLevel', code: '03', description: '二級', isActive: true },
        { section: 'jobLevel', code: '04', description: '三級', isActive: true },
        { section: 'jobLevel', code: '05', description: '四級', isActive: true },
        { section: 'jobLevel', code: '06', description: '五級', isActive: true },

        // Shift Types (班別)
        { section: 'shift', code: '01', description: '日班', isActive: true },
        { section: 'shift', code: '02', description: '夜班', isActive: true },
        { section: 'shift', code: '03', description: '輪班', isActive: true },
        { section: 'shift', code: '04', description: '彈性班', isActive: true },

        // Education Levels (學歷)
        { section: 'education', code: '01', description: '博士', isActive: true },
        { section: 'education', code: '02', description: '碩士', isActive: true },
        { section: 'education', code: '03', description: '大專', isActive: true },
        { section: 'education', code: '04', description: '高中', isActive: true },
        { section: 'education', code: '05', description: '高中以下', isActive: true },

        // Blood Types (血型)
        { section: 'bloodType', code: 'A', description: 'A型', isActive: true },
        { section: 'bloodType', code: 'B', description: 'B型', isActive: true },
        { section: 'bloodType', code: 'O', description: 'O型', isActive: true },
        { section: 'bloodType', code: 'AB', description: 'AB型', isActive: true },

        // Gender (性別)
        { section: 'gender', code: 'M', description: '男', isActive: true },
        { section: 'gender', code: 'W', description: '女', isActive: true },
        { section: 'gender', code: 'U', description: '未指定', isActive: true },

        // Marital Status (婚姻狀態)
        { section: 'maritalStatus', code: '1', description: '已婚', isActive: true },
        { section: 'maritalStatus', code: '0', description: '未婚', isActive: true },
      ];

      await Variable.insertMany(variables);
      console.log(`Successfully seeded ${variables.length} variables`);
    } catch (error) {
      console.error('Error seeding variables:', error);
      throw error;
    }
  }

  /**
   * Clear all variables (use with caution)
   */
  async clearVariables(): Promise<void> {
    try {
      await Variable.deleteMany({});
      console.log('All variables cleared');
    } catch (error) {
      console.error('Error clearing variables:', error);
      throw error;
    }
  }

  /**
   * Reseed variables (clear and seed)
   */
  async reseedVariables(): Promise<void> {
    await this.clearVariables();
    await this.seedVariables();
  }
}

export const variableSeedService = new VariableSeedService();
