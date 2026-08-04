import mongoose from 'mongoose';
import { Attendance } from '../models/Attendance'; // <-- 請改成實際路徑
import { Employee } from '../models/Employee';     // <-- 請改成實際路徑

const MONGODB_URI = 'mongodb://root:good1234@localhost:27019/HRMS?authSource=admin'; // <-- 改為你的連線字串

// 共用的欄位 rename function
async function renameFields(
  model: mongoose.Model<any>,
  modelName: string,
  renameMap: Record<string, string>
) {
  const matchStage: any = {
    $or: Object.keys(renameMap).map((oldKey) => ({ [oldKey]: { $exists: true } }))
  };

  const setStage: any = {};
  const unsetFields: string[] = [];

  for (const [oldField, newField] of Object.entries(renameMap)) {
    setStage[newField] = `$${oldField}`;
    unsetFields.push(oldField);
  }

  console.log(`🔄 Starting migration for ${modelName}...`);

  const result = await model.updateMany(matchStage, [
    { $set: setStage },
    { $unset: unsetFields }
  ]);

  console.log(`✅ ${modelName}: ${result.modifiedCount} documents updated.`);
}

async function main() {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected.\n');

    // --- Attendance Collection ---
    await renameFields(Attendance, 'Attendance', {
      empID: 'cardID',
      empID2: 'empID'
    });

    // --- Employee Collection ---
    await renameFields(Employee, 'Employee', {
      empID: 'cardID',
      empID2: 'empID'
    });

    console.log('\n🎉 Migration completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

main();
