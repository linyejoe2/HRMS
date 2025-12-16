import { Schema, model, Document, Types } from 'mongoose';

// Note: These fields now store variable codes from the Variable table
// No longer using enums as values are dynamic


export interface IEmployee extends Document {
  // 員工基本資訊 (既有欄位)
  name: string;
  empID: string; // 員工編號
  cardID: string; // 卡號 / Original ID from Access DB
  password?: string;
  isActive: boolean;
  role: 'admin' | 'hr' | 'employee' | 'manager';
  lastLogin?: Date;
  department?: string; // Department code reference (e.g., "2000", "8000")
  hireDate?: Date; // 到職日期 (入職日期)
  salary?: number;
  createdAt: Date;
  updatedAt: Date;

  // --- 圖片擴充欄位 ---

  // 基本資料
  birthPlace?: string; // 籍貫
  idNumber?: string; // 身份證號
  dateOfBirth?: Date; // 出生日期
  education?: string; // 學歷 - stores variable code
  bloodType?: string; // 血型 - stores variable code
  maritalStatus?: string; // 婚姻狀態 - stores variable code
  gender?: string; // 性別 - stores variable code
  photoURL?: string; // 相片 (儲存照片的 URL 或檔案路徑)
  address?: string; // 住址
  phone?: string; // 電話
  bankAccount?: string; // 帳號

  // 職務/公司資訊
  shift?: string; // 班別 - stores variable code
  jobTitle?: string; // 職稱 - stores variable code
  jobLevel?: string; // 職等 - stores variable code
  endDate?: Date; // 離職日期

  // 薪資/保險/退休相關
  baseSalary?: number; // 底薪
  jobAllowance?: number; // 職務加給
  dutyAllowance?: number; // 職等加給
  professionalAllowance?: number; // 專業加給
  specialAllowance?: number; // 特別加給
  workSubsidy?: number; // 工作津貼

  laborInsuranceSalary?: number; // 勞保薪資 (投保薪資)
  laborInsurancePremium?: number; // 勞保費
  addLaborInsurancePremium?: number; // 加勞保費

  healthInsuranceSalary?: number; // 健保薪資 (投保薪資)
  healthInsurancePremium?: number; // 健保費
  addHealthInsurancePremium?: number; // 加健保費
  insuredDependents?: number; // 眷保人數 (健保)

  insuranceJoinDate?: Date; // 加保日期 (勞健保加保日期)
  dependentsCount?: number; // 扶養人數

  laborRetirementSalary?: number; // 勞退薪資 (提繳工資)
  selfContributionRatio?: number; // 自提勞退比 (%)
  selfContributionAmount?: number; // 自提勞退金 (通常計算所得，但為求欄位對應先加)
  companyContributionAmount?: number; // 公提勞退金 (通常計算所得，但為求欄位對應先加)
}

const EmployeeSchema = new Schema<IEmployee>({
  // 員工基本資訊 (既有欄位)
  name: {
    type: String,
    required: true,
    trim: true
  },
  empID: { // 員工編號
    type: String,
    required: true,
    unique: true
  },
  cardID: { // 卡號
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    select: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['admin', 'hr', 'employee', 'manager'],
    default: 'employee'
  },
  lastLogin: {
    type: Date
  },
  department: { // Department code (references Department.code)
    type: String,
    ref: 'Department',
    trim: true
  },
  hireDate: { // 到職日期
    type: Date
  },
  salary: { // 薪水 (總括或月薪，可根據需求調整為 baseSalary)
    type: Number,
    select: false
  },

  // --- 圖片擴充欄位 ---

  // 基本資料
  birthPlace: { // 籍貫
    type: String,
    trim: true
  },
  idNumber: { // 身份證號
    type: String,
    trim: true
  },
  dateOfBirth: { // 出生日期
    type: Date
  },
  education: { // 學歷 - stores variable code
    type: String,
    trim: true
  },
  bloodType: { // 血型 - stores variable code
    type: String,
    trim: true
  },
  maritalStatus: { // 婚姻狀態 - stores variable code
    type: String,
    trim: true
  },
  gender: { // 性別 - stores variable code
    type: String,
    trim: true
  },
  photoURL: { // 相片 URL
    type: String
  },
  address: { // 住址
    type: String
  },
  phone: { // 電話
    type: String
  },
  bankAccount: { // 帳號
    type: String
  },

  // 職務/公司資訊
  shift: { // 班別
    type: String
  },
  jobTitle: { // 職稱
    type: String,
    trim: true
  },
  jobLevel: { // 職等
    type: String,
    trim: true
  },
  endDate: { // 離職日期
    type: Date
  },

  // 薪資/保險/退休相關
  baseSalary: { // 底薪
    type: Number,
    select: false
  },
  jobAllowance: { // 職務加給
    type: Number,
    select: false
  },
  dutyAllowance: { // 職等加給
    type: Number,
    select: false
  },
  professionalAllowance: { // 專業加給
    type: Number,
    select: false
  },
  specialAllowance: { // 特別加給
    type: Number,
    select: false
  },
  workSubsidy: { // 工作津貼
    type: Number,
    select: false
  },

  laborInsuranceSalary: { // 勞保薪資
    type: Number,
    select: false
  },
  laborInsurancePremium: { // 勞保費
    type: Number,
    select: false
  },
  addLaborInsurancePremium: { // 加勞保費
    type: Number,
    select: false
  },

  healthInsuranceSalary: { // 健保薪資
    type: Number,
    select: false
  },
  healthInsurancePremium: { // 健保費
    type: Number,
    select: false
  },
  addHealthInsurancePremium: { // 加健保費
    type: Number,
    select: false
  },
  insuredDependents: { // 眷保人數
    type: Number
  },

  insuranceJoinDate: { // 加保日期
    type: Date
  },
  dependentsCount: { // 扶養人數
    type: Number
  },

  laborRetirementSalary: { // 勞退薪資
    type: Number,
    select: false
  },
  selfContributionRatio: { // 自提勞退比 (%)
    type: Number,
    select: false
  },
  selfContributionAmount: { // 自提勞退金
    type: Number,
    select: false
  },
  companyContributionAmount: { // 公提勞退金
    type: Number,
    select: false
  }

}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for performance
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ isActive: 1 });
EmployeeSchema.index({ dateOfBirth: 1 }); // 新增索引
EmployeeSchema.index({ jobTitle: 1 }); // 新增索引

export const Employee = model<IEmployee>('Employee', EmployeeSchema);