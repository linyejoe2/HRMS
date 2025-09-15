export interface User {
  name: string;
  empID: string; // Employee ID
  empID2: string; // Original ID from Access DB
  role: UserLevel;
  lastLogin: string;
}

export interface Employee {
  _id?: string;
  name: string;
  empID: string;
  empID2: string;
  isActive: boolean;
  role: UserLevel;
  lastLogin?: string;
  department?: string;
  createdAt?: string;
  updatedAt?: string;
}

export enum UserLevel {
  ADMIN = 'admin',
  HR = 'jr',
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
  data: {
    employee: User,
    token: string
  },
  message: string,
  success: boolean
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
  empID2: string;
  empID?: string;
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
  success: boolean;
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