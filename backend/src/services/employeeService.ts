import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Employee, IEmployee } from '../models';
import { config } from '../config';
import { APIError } from '../middleware';

export class EmployeeService {
  async findByEmpID(empID: string): Promise<IEmployee | null> {
    return Employee.findOne({ empID, isActive: true });
  }

  async findById(id: string): Promise<IEmployee | null> {
    return Employee.findById(id);
  }

  async createEmployee(employeeData: Partial<IEmployee>): Promise<IEmployee> {
    const employee = new Employee(employeeData);
    return employee.save();
  }

  async updateEmployee(id: string, updateData: Partial<IEmployee>): Promise<IEmployee | null> {
    return Employee.findByIdAndUpdate(id, updateData, { new: true });
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const result = await Employee.findByIdAndUpdate(id, { isActive: false });
    return !!result;
  }

  async getAllEmployees(page: number = 1, limit: number = 10, department?: string): Promise<{
    employees: IEmployee[];
    total: number;
    pages: number;
  }> {
    const filter: any = { isActive: true };
    if (department) {
      filter.department = department;
    }

    const skip = (page - 1) * limit;
    
    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort({ name: 1 }),
      Employee.countDocuments(filter)
    ]);

    return {
      employees,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  async searchEmployees(query: string): Promise<IEmployee[]> {
    return Employee.find({
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { empID: { $regex: query, $options: 'i' } },
        { empID2: { $regex: query, $options: 'i' } },
        { department: { $regex: query, $options: 'i' } }
      ]
    }).select('-password').limit(20);
  }
}

export class AuthService {
  async login(empID: string, password: string): Promise<{ token: string; employee: Partial<IEmployee> }> {
    // Find employee by empID
    const employee = await Employee.findOne({ empID, isActive: true }).select('+password');
    
    if (!employee) {
      throw new APIError('Invalid employee ID or password', 401);
    }

    // Check if employee has registered (has a password)
    if (!employee.password) {
      throw new APIError('Please register first to set up your account', 400);
    }

    // Validate password
    const isValidPassword = await bcrypt.compare(password, employee.password);
    if (!isValidPassword) {
      throw new APIError('Invalid employee ID or password', 401);
    }

    // Update last login
    employee.lastLogin = new Date();
    await employee.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: (employee._id as any).toString(), 
        empID: employee.empID,
        role: employee.role 
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as SignOptions
    );

    // Return token and employee data (excluding password)
    const { password: _, ...employeeData } = employee.toObject();
    
    return { token, employee: employeeData };
  }

  async register(empID: string, password: string, email?: string): Promise<{ token: string; employee: Partial<IEmployee> }> {
    // Find existing employee record from Access DB migration
    const existingEmployee = await Employee.findOne({ empID });
    
    if (!existingEmployee) {
      throw new APIError('Employee ID not found in the system. Please contact HR.', 404);
    }

    if (existingEmployee.password) {
      throw new APIError('Employee already registered. Please login instead.', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update employee with authentication details
    existingEmployee.password = hashedPassword;
    existingEmployee.lastLogin = new Date();
    
    await existingEmployee.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: (existingEmployee._id as any).toString(), 
        empID: existingEmployee.empID,
        role: existingEmployee.role 
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as SignOptions
    );

    // Return token and employee data (excluding password)
    const { password: _, ...employeeData } = existingEmployee.toObject();
    
    return { token, employee: employeeData };
  }

  async changePassword(employeeId: string, currentPassword: string, newPassword: string): Promise<void> {
    const employee = await Employee.findById(employeeId).select('+password');
    
    if (!employee) {
      throw new APIError('Employee not found', 404);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, employee.password!);
    if (!isValidPassword) {
      throw new APIError('Current password is incorrect', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    employee.password = hashedPassword;
    await employee.save();
  }
}

export const employeeService = new EmployeeService();
export const authService = new AuthService();