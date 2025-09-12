export interface User {
  id: number;
  account: string;
  email: string;
  level: UserLevel;
  description?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export enum UserLevel {
  LAWYER = 0,
  CO_LAWYER = 1,
  LAWYER_ASSISTANT = 2,
  CLIENT = 3
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
  token: string;
  user: User;
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