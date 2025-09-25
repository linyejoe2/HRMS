import axios, { AxiosResponse } from 'axios';
import { AuthRequest, RegisterRequest, AuthResponse, Conversation, Message, AIRequest, AIResponse, AIModel, ChangePasswordRequest, UpdateProfileRequest, User, Document, AttendanceResponse, AttendanceSummary, Employee, LeaveRequestForm, LeaveRequest } from '../types';

const API_BASE_URL = "";
// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials: AuthRequest): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/login', credentials),
  
  register: (userData: RegisterRequest): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register', userData),
  
  getMe: () => api.get('/auth/me'),
  
  verify: () => api.post('/auth/verify'),
  
  changePassword: (passwordData: ChangePasswordRequest): Promise<AxiosResponse<{ message: string }>> =>
    api.post('/auth/change-password', passwordData),
  
  updateProfile: (profileData: UpdateProfileRequest): Promise<AxiosResponse<{ user: User }>> =>
    api.put('/auth/profile', profileData),
};



// Create a separate axios instance for AI service endpoints with proper JWT handling
const aiServiceAPI = axios.create({
  baseURL: API_BASE_URL + 'models',
  headers: {
    'Content-Type': 'application/json',
  },
});

aiServiceAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

aiServiceAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const conversationAPI = {
  getConversations: (): Promise<AxiosResponse<Conversation[]>> => {
    return aiServiceAPI.get('/conversations').then(response => {
      return {
        ...response,
        data: response.data.conversations || []
      };
    });
  },
  
  createConversation: (title?: string): Promise<AxiosResponse<Conversation>> => {
    return aiServiceAPI.post('/conversations', { title }).then(response => {
      const conversationData = response.data;
      return {
        ...response,
        data: {
          id: conversationData.conversation_id,
          user_id: 0, // Will be filled by backend
          title: conversationData.title || title || 'New Conversation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };
    });
  },
  
  getConversation: (id: number): Promise<AxiosResponse<Conversation>> =>
    api.get(`/conversations/${id}`), // Keep this in backend for now
  
  updateConversation: (id: number, title: string): Promise<AxiosResponse<{ message: string }>> =>
    api.put(`/conversations/${id}`, { title }), // Keep this in backend for now
  
  deleteConversation: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/conversations/${id}`), // Keep this in backend for now
  
  getMessages: (conversationId: number): Promise<AxiosResponse<Message[]>> => {
    return aiServiceAPI.get(`/conversations/${conversationId}/messages`).then(response => {
      const messagesData = response.data;
      return {
        ...response,
        data: messagesData.messages?.map((msg: any, index: number) => ({
          id: index + 1, // AI service doesn't return message IDs
          conversation_id: conversationId,
          content: msg.content,
          role: msg.role,
          context_chunks: msg.context_chunks || undefined,
          created_at: msg.created_at
        })) || []
      };
    });
  },
};

export const aiAPI = {
  sendMessage: (request: AIRequest): Promise<AxiosResponse<AIResponse>> => {
    // Convert frontend request to AI service format
    const aiServiceRequest = {
      conversation_id: request.conversation_id,
      messages: [
        { role: "user", content: request.message }
      ],
      model: request.model || AIModel.OLLAMA,
      use_rag: true,
      top_k: 5,
      similarity_threshold: 0.1
    };
    
    return aiServiceAPI.post('/chat', aiServiceRequest).then(response => {
      // Transform AI service response to match frontend interface
      const aiServiceResponse = response.data;
      return {
        ...response,
        data: {
          response: aiServiceResponse.response,
          conversation_id: aiServiceResponse.conversation_id || request.conversation_id || 0,
          sources: aiServiceResponse.context_chunks?.map((chunk: any) => chunk.chunk_text) || [],
          context_chunks: aiServiceResponse.context_chunks || []
        }
      };
    });
  },
  
  checkHealth: () => aiServiceAPI.get('/health'),
  
  checkAllModelsHealth: (): Promise<AxiosResponse<Record<AIModel, boolean>>> => {
    return aiServiceAPI.get('/health').then(response => {
      const healthData = response.data;
      const modelHealth: Record<AIModel, boolean> = {
        [AIModel.OLLAMA]: healthData.services?.ollama?.status === 'healthy',
        [AIModel.CHATGPT]: healthData.services?.openai?.status === 'healthy',
        [AIModel.gpt4o]: healthData.services?.openai?.status === 'healthy',
        [AIModel.gpt5nano]: healthData.services?.openai?.status === 'healthy',
        [AIModel.gpt5mini]: healthData.services?.openai?.status === 'healthy',
        [AIModel.DEEPSEEK]: healthData.services?.deepseek?.status === 'healthy'
      };
      
      return {
        ...response,
        data: modelHealth
      };
    });
  },
};

export const documentAPI = {
  uploadDocument: (conversationId: number, file: File): Promise<AxiosResponse<Document>> => {
    const formData = new FormData();
    formData.append('file', file);
    return aiServiceAPI.post(`/documents/upload/${conversationId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  listDocuments: (conversationId: number): Promise<AxiosResponse<Document[]>> =>
    aiServiceAPI.get(`/documents/${conversationId}/list`),
  
  deleteDocument: (documentId: number): Promise<AxiosResponse<{ message: string }>> =>
    aiServiceAPI.delete(`/documents/${documentId}`),
  
  downloadDocument: (documentId: number): Promise<AxiosResponse<Blob>> =>
    aiServiceAPI.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
    }),
};

export const attendanceAPI = {
  scanNow: (): Promise<AxiosResponse<{success: boolean, message: string, data: { processed: number, updated: number, imported: number;}}>>=> api.post(`/attendance/scan/now`),

  // Import attendance data for a specific date (admin/hr only)
  importByDate: (date: string): Promise<AxiosResponse<{ imported: number; errors: string[] }>> =>
    api.post(`/attendance/import/${date}`),
  
  // Get attendance records for a specific date
  getByDate: (date: string): Promise<AxiosResponse<AttendanceResponse>> =>
    api.get(`/attendance/date/${date}`),
  
  // Get attendance records for a date range
  getByDateRange: (startDate: string, endDate: string): Promise<AxiosResponse<AttendanceResponse>> =>
    api.get(`/attendance/daterange?startDate=${startDate}&endDate=${endDate}`),
  
  // Get my attendance records
  getMyAttendance: (startDate: string, endDate: string): Promise<AxiosResponse<AttendanceResponse>> =>
    api.get(`/attendance/my?startDate=${startDate}&endDate=${endDate}`),
  
  // Get attendance records for an employee (admin/hr only)
  getEmployeeAttendance: (empID: string, startDate: string, endDate: string): Promise<AxiosResponse<AttendanceResponse>> =>
    api.get(`/attendance/employee/${empID}?startDate=${startDate}&endDate=${endDate}`),
  
  // Get attendance summary (admin/hr only)
  getSummary: (startDate: string, endDate: string): Promise<AxiosResponse<{ summary: AttendanceSummary }>> =>
    api.get(`/attendance/summary?startDate=${startDate}&endDate=${endDate}`)
};

export const employeeAPI = {
  // Get all employees (with pagination)
  getAll: (page: number = 1, limit: number = 20, department?: string): Promise<AxiosResponse<{ data:{ employees: Employee[], total: number, pages: number }}>> =>
    api.get(`/employees?page=${page}&limit=${limit}${department ? `&department=${department}` : ''}`),
  
  // Search employees
  search: (query: string): Promise<AxiosResponse<{ employees: Employee[] }>> =>
    api.get(`/employees/search?q=${encodeURIComponent(query)}`),
  
  // Get single employee
  getById: (id: string): Promise<AxiosResponse<{ employee: Employee }>> =>
    api.get(`/employees/${id}`),
  
  // Create employee (HR/Admin only)
  create: (employeeData: Partial<Employee>): Promise<AxiosResponse<{ employee: Employee }>> =>
    api.post('/employees', employeeData),
  
  // Update employee (HR/Admin only)
  update: (id: string, employeeData: Partial<Employee>): Promise<AxiosResponse<{ employee: Employee }>> =>
    api.put(`/employees/${id}`, employeeData),
  
  // Delete/deactivate employee (Admin only)
  delete: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/employees/${id}`)
};

export const leaveAPI = {
  // Create leave request
  create: (leaveData: LeaveRequestForm): Promise<AxiosResponse<{ success: boolean, data: LeaveRequest, message: string }>> =>
    api.post('/leave/create', leaveData),

  // Get my leave requests
  getMy: (): Promise<AxiosResponse<{ success: boolean, data: LeaveRequest[], message: string }>> =>
    api.get('/leave/my'),

  // Get all leave requests (HR/Admin only)
  getAll: (status?: string): Promise<AxiosResponse<{ success: boolean, data: LeaveRequest[], message: string }>> =>
    api.get(`/leave/all${status ? `?status=${status}` : ''}`),

  // Get leave request by ID
  getById: (id: string): Promise<AxiosResponse<{ success: boolean, data: LeaveRequest, message: string }>> =>
    api.get(`/leave/${id}`),

  // Approve leave request (HR/Admin only)
  approve: (id: string): Promise<AxiosResponse<{ success: boolean, data: LeaveRequest, message: string }>> =>
    api.put(`/leave/${id}/approve`),

  // Reject leave request (HR/Admin only)
  reject: (id: string, reason: string): Promise<AxiosResponse<{ success: boolean, data: LeaveRequest, message: string }>> =>
    api.put(`/leave/${id}/reject`, { reason })
};

// Convenience functions for leave operations
export const createLeaveRequest = leaveAPI.create;
export const getMyLeaveRequests = leaveAPI.getMy;
export const getAllLeaveRequests = leaveAPI.getAll;
export const getLeaveRequestById = leaveAPI.getById;
export const approveLeaveRequest = leaveAPI.approve;
export const rejectLeaveRequest = leaveAPI.reject;