import mongoose, { Mixed } from 'mongoose';

// Replace with your actual MongoDB connection string
const MONGODB_URI = 'mongodb://root:good1234@localhost:27019/HRMS?authSource=admin';

// Define the Employee schema (only the fields you need)
const employeeSchema = new mongoose.Schema({
  isActive: { type: mongoose.Schema.Types.Boolean }
}, { strict: false }); // ignore other fields

const Employee = mongoose.model('Employee', employeeSchema, 'employees');

async function fixIsActiveField() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all employees where isActive is a string
    const employees = await Employee.find({
      isActive: { $in: ['true', 'false'] }
    });

    console.log(`🔍 Found ${employees.length} employees with string isActive`);

    // Update each employee
    const updates = employees.map(async (emp) => {
      const newIsActive = String(emp.isActive) === 'true';
      emp.isActive = newIsActive;
      return emp.save();
    });

    await Promise.all(updates);
    console.log(`✅ Updated ${employees.length} documents`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixIsActiveField();
