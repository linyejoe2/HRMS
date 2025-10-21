export interface User {
  name: string;
  empID: string; // Employee ID
  cardID: string; // Original ID from Access DB
  role: UserLevel;
  lastLogin: string;
}

export interface Employee {
  _id?: string;
  name: string;
  empID: string;
  cardID: string;
  isActive: boolean;
  role: UserLevel;
  lastLogin?: string;
  department?: string;
  hireDate?: string; // 入職日期
  salary?: number; // 薪水
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveRequestForm {
  leaveType: string; // select
  reason: string;
  leaveStart: string; // use timedate choose components
  leaveEnd: string; // use timedate choose components
}

export interface LeaveRequest extends LeaveRequestForm {
  _id?: string; // MongoDB ID
  name: string; // from table employee
  department: string; // from table employee
  empID: string; // from table employee
  YY: string; // the date that create this request
  mm: string; // the date that create this request
  DD: string; // the date that create this request
  hour: string; // calc by leaveStart and leaveEnd
  minutes: string; // calc by leaveStart and leaveEnd
  status: 'created' | 'approved' | 'rejected' | 'cancel';
  rejectionReason?: string;
  approvedBy?: string;
  sequenceNumber: number; // auto-increment sequence number
  createdAt?: string;
  updatedAt?: string;
}

export enum UserLevel {
  ADMIN = 'admin',
  HR = 'hr',
  EMPLOYEE = 'employee',
  MANAGER = 'manager'
}

export interface AuthRequest {
  empID: string;
  password: string;
}

export interface RegisterRequest {
  empID: string;
  password: string;
}

export interface AuthResponse {
  error: boolean;
  message: string;
  data: {
    employee: User;
    token: string;
  };
}

export interface Conversation {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
  context_chunks?: ContextChunk[];
}

export interface ContextChunk {
  id: number;
  document_id: number;
  conversation_id: number;
  user_id: number;
  chunk_text: string;
  chunk_index: number;
  similarity: number;
  meta_data?: any;
}

export enum AIModel {
  OLLAMA = 'ollama/gpt-oss:20b',
  CHATGPT = 'openai/gpt-4o-mini',
  DEEPSEEK = 'deepseek/deepseek-chat',
  gpt4o = "openai/gpt-4o",
  gpt5nano = "openai/gpt-5-nano",
  gpt5mini = "openai/gpt-5-mini",
}

export interface AIRequest {
  message: string;
  conversation_id?: number;
  context_documents?: number[];
  model?: AIModel;
}

export interface AIResponse {
  response: string;
  conversation_id: number;
  sources?: string[];
  context_chunks?: ContextChunk[];
}

export interface Document {
  document_id: number;
  filename: string;
  original_name: string;
  chunks_count: number;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  description?: string;
}

export interface AttendanceRecord {
  _id: string;
  cardID: string;
  employeeName?: string;
  department?: string;
  date: string;
  clockInTime?: string;
  clockInStatus?: string;
  clockOutTime?: string;
  clockOutStatus?: string;
  workHours?: number;
  isLate?: boolean;
  isAbsent?: boolean;
  rawRecord: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceResponse {
  error: boolean;
  message: string;
  data: {
    date: string;
    count: number;
    records: AttendanceRecord[];
  };
}

export interface AttendanceSummary {
  totalEmployees: number;
  presentEmployees: number;
  absentEmployees: number;
  lateEmployees: number;
  averageWorkHours: number;
}

export interface PostClockRequestForm {
  date: string; // Date for the clock correction
  time: string; // Time to be recorded
  clockType: 'in' | 'out'; // Clock in or out
  reason: string;
  supportingInfo?: string; // File path or URL
}

export interface PostClockRequest extends PostClockRequestForm {
  _id?: string; // MongoDB ID
  name: string; // from table employee
  department: string; // from table employee
  empID: string; // from table employee
  status: 'created' | 'approved' | 'rejected' | 'cancel';
  rejectionReason?: string;
  approvedBy?: string;
  sequenceNumber: number; // auto-increment sequence number
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessTripRequestForm {
  destination: string; // Destination location
  purpose: string; // Purpose of the trip
  tripStart: string; // Start date and time
  tripEnd: string; // End date and time
  transportation?: string; // Mode of transportation
  estimatedCost?: number; // Estimated cost
  notes?: string; // Additional notes
}

export interface BusinessTripRequest extends BusinessTripRequestForm {
  _id?: string; // MongoDB ID
  name: string; // from table employee
  department: string; // from table employee
  empID: string; // from table employee
  status: 'created' | 'approved' | 'rejected' | 'cancel';
  rejectionReason?: string;
  approvedBy?: string;
  sequenceNumber: number; // auto-increment sequence number
  createdAt?: string;
  updatedAt?: string;
}