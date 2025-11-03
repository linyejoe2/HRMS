import axios, { AxiosResponse } from 'axios';
import { AuthRequest, RegisterRequest, AuthResponse, Conversation, Message, AIRequest, AIResponse, AIModel, ChangePasswordRequest, UpdateProfileRequest, User, Document, AttendanceResponse, AttendanceSummary, Employee, LeaveRequestForm, LeaveRequest, PostClockRequestForm, PostClockRequest, BusinessTripRequestForm, BusinessTripRequest } from '../types';
import { toast } from 'react-toastify';

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
      if (!window.location.href.includes("/login")) {
        toast.error("登入逾時，請重新登入。")
        window.location.href = '/login';
      }
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

  getMeWithSensitive: (password: string, employee_id?: string) => api.post('/auth/profile/sensitive', { password, employee_id }),

  verify: () => api.post('/auth/verify'),
  
  changePassword: (passwordData: ChangePasswordRequest): Promise<AxiosResponse<{ message: string }>> =>
    api.post('/auth/change-password', passwordData),
  
  updateProfile: (profileData: UpdateProfileRequest): Promise<AxiosResponse<{ data: {employee: User }, message: string}>> =>
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
      if (!window.location.href.includes("/login")) {
        toast.error("登入逾時，請重新登入。")
        window.location.href = '/login';
      }
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
  scanNow: (): Promise<AxiosResponse<{error: boolean, message: string, data: { processed: number, updated: number, imported: number;}}>>=> api.post(`/attendance/scan/now`),

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
  getAll: (page: number = 1, limit: number = 20, department?: string): Promise<AxiosResponse<{ error: boolean, message: string, data:{ employees: Employee[], total: number, pages: number }}>> =>
    api.get(`/employees?page=${page}&limit=${limit}${department ? `&department=${department}` : ''}`),
  
  // Search employees
  search: (query: string): Promise<AxiosResponse<{ error: boolean, message: string, data: { employees: Employee[] } }>> =>
    api.get(`/employees/search?q=${encodeURIComponent(query)}`),

  // Get single employee
  getById: (id: string): Promise<AxiosResponse<{ error: boolean, message: string, data: { employee: Employee } }>> =>
    api.get(`/employees/${id}`),

  // Create employee (HR/Admin only)
  create: (employeeData: Partial<Employee>): Promise<AxiosResponse<{ error: boolean, message: string, data: { employee: Employee } }>> =>
    api.post('/employees', employeeData),

  // Update employee (HR/Admin only)
  update: (id: string, employeeData: Partial<Employee>): Promise<AxiosResponse<{ error: boolean, message: string, data: { employee: Employee } }>> =>
    api.put(`/employees/${id}`, employeeData),

  // Delete/deactivate employee (Admin only)
  delete: (id: string): Promise<AxiosResponse<{ error: boolean, message: string }>> =>
    api.delete(`/employees/${id}`)
};

export const leaveAPI = {
  // Create leave request
  create: (leaveData: LeaveRequestForm): Promise<AxiosResponse<{ error: boolean, message: string, data: LeaveRequest }>> => {
    const formData = new FormData();
    formData.append('leaveType', leaveData.leaveType);
    formData.append('reason', leaveData.reason);
    formData.append('leaveStart', leaveData.leaveStart);
    formData.append('leaveEnd', leaveData.leaveEnd);

    if (leaveData.supportingInfo && leaveData.supportingInfo.length > 0) {
      leaveData.supportingInfo.forEach((file) => {
        formData.append('supportingInfo', file);
      });
    }

    return api.post('/leave/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get my leave requests
  getMy: (): Promise<AxiosResponse<{ error: boolean, message: string, data: LeaveRequest[] }>> =>
    api.get('/leave/my'),

  // Get all leave requests (HR/Admin only)
  getAll: (status?: string): Promise<AxiosResponse<{ error: boolean, message: string, data: LeaveRequest[] }>> =>
    api.get(`/leave/all${status ? `?status=${status}` : ''}`),

  // Get leave request by ID
  getById: (id: string): Promise<AxiosResponse<{ error: boolean, message: string, data: LeaveRequest }>> =>
    api.get(`/leave/${id}`),

  // Get leave request by sequence number
  getBySequenceNumber: (sequenceNumber: number): Promise<AxiosResponse<{ error: boolean, message: string, data: LeaveRequest }>> =>
    api.get(`/leave/sequence/${sequenceNumber}`),

  // Approve leave request (HR/Admin only)
  approve: (id: string): Promise<AxiosResponse<{ error: boolean, message: string, data: LeaveRequest }>> =>
    api.put(`/leave/${id}/approve`),

  // Reject leave request (HR/Admin only)
  reject: (id: string, reason: string): Promise<AxiosResponse<{ error: boolean, message: string, data: LeaveRequest }>> =>
    api.put(`/leave/${id}/reject`, { reason }),

  // Cancel leave request
  cancel: (id: string, reason?: string): Promise<AxiosResponse<{ error: boolean, message: string, data: LeaveRequest }>> =>
    api.put(`/leave/${id}/cancel`, reason ? { reason } : {}),

  // Get cancelled leave requests (HR/Admin only)
  getCancelled: (employeeID?: string): Promise<AxiosResponse<{ error: boolean, message: string, data: LeaveRequest[] }>> =>
    api.get(`/leave/cancelled/all${employeeID ? `?employeeID=${employeeID}` : ''}`)
};

// Convenience functions for leave operations
export const createLeaveRequest = leaveAPI.create;
export const getMyLeaveRequests = leaveAPI.getMy;
export const getAllLeaveRequests = leaveAPI.getAll;
export const getLeaveRequestById = leaveAPI.getById;
export const approveLeaveRequest = leaveAPI.approve;
export const rejectLeaveRequest = leaveAPI.reject;
export const cancelLeaveRequest = leaveAPI.cancel;
export const getCancelledLeaveRequests = leaveAPI.getCancelled;

export const postClockAPI = {
  // Create postclock request
  create: (postClockData: PostClockRequestForm): Promise<AxiosResponse<{ error: boolean, message: string, data: PostClockRequest }>> => {
    const formData = new FormData();
    formData.append('date', postClockData.date);
    formData.append('time', postClockData.time);
    formData.append('clockType', postClockData.clockType);
    formData.append('reason', postClockData.reason);

    if (postClockData.supportingInfo && postClockData.supportingInfo.length > 0) {
      postClockData.supportingInfo.forEach((file) => {
        formData.append('supportingInfo', file);
      });
    }

    return api.post('/postclock/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get my postclock requests
  getMy: (): Promise<AxiosResponse<{ error: boolean, message: string, data: PostClockRequest[] }>> =>
    api.get('/postclock/my'),

  // Get all postclock requests (HR/Admin only)
  getAll: (status?: string): Promise<AxiosResponse<{ error: boolean, message: string, data: PostClockRequest[] }>> =>
    api.get(`/postclock/all${status ? `?status=${status}` : ''}`),

  // Get postclock request by ID
  getById: (id: string): Promise<AxiosResponse<{ error: boolean, message: string, data: PostClockRequest }>> =>
    api.get(`/postclock/${id}`),

  // Get postclock request by sequence number
  getBySequenceNumber: (sequenceNumber: number): Promise<AxiosResponse<{ error: boolean, message: string, data: PostClockRequest }>> =>
    api.get(`/postclock/sequence/${sequenceNumber}`),

  // Approve postclock request (HR/Admin only)
  approve: (id: string): Promise<AxiosResponse<{ error: boolean, message: string, data: PostClockRequest }>> =>
    api.put(`/postclock/${id}/approve`),

  // Reject postclock request (HR/Admin only)
  reject: (id: string, reason: string): Promise<AxiosResponse<{ error: boolean, message: string, data: PostClockRequest }>> =>
    api.put(`/postclock/${id}/reject`, { reason }),

  // Cancel postclock request
  cancel: (id: string, reason?: string): Promise<AxiosResponse<{ error: boolean, message: string, data: PostClockRequest }>> =>
    api.put(`/postclock/${id}/cancel`, reason ? { reason } : {}),

  // Get cancelled postclock requests (HR/Admin only)
  getCancelled: (employeeID?: string): Promise<AxiosResponse<{ error: boolean, message: string, data: PostClockRequest[] }>> =>
    api.get(`/postclock/cancelled/all${employeeID ? `?employeeID=${employeeID}` : ''}`)
};

// Convenience functions for postclock operations
export const createPostClockRequest = postClockAPI.create;
export const getMyPostClockRequests = postClockAPI.getMy;
export const getAllPostClockRequests = postClockAPI.getAll;
export const getPostClockRequestById = postClockAPI.getById;
export const approvePostClockRequest = postClockAPI.approve;
export const rejectPostClockRequest = postClockAPI.reject;
export const cancelPostClockRequest = postClockAPI.cancel;
export const getCancelledPostClockRequests = postClockAPI.getCancelled;

export const businessTripAPI = {
  // Create business trip request
  create: (businessTripData: BusinessTripRequestForm): Promise<AxiosResponse<{ error: boolean, message: string, data: BusinessTripRequest }>> => {
    const formData = new FormData();
    formData.append('destination', businessTripData.destination);
    formData.append('purpose', businessTripData.purpose);
    formData.append('tripStart', businessTripData.tripStart);
    formData.append('tripEnd', businessTripData.tripEnd);

    if (businessTripData.transportation) {
      formData.append('transportation', businessTripData.transportation);
    }
    if (businessTripData.estimatedCost !== undefined) {
      formData.append('estimatedCost', businessTripData.estimatedCost.toString());
    }
    if (businessTripData.notes) {
      formData.append('notes', businessTripData.notes);
    }

    if (businessTripData.supportingInfo && businessTripData.supportingInfo.length > 0) {
      businessTripData.supportingInfo.forEach((file) => {
        formData.append('supportingInfo', file);
      });
    }

    return api.post('/businesstrip/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get my business trip requests
  getMy: (): Promise<AxiosResponse<{ error: boolean, message: string, data: BusinessTripRequest[] }>> =>
    api.get('/businesstrip/my'),

  // Get all business trip requests (HR/Admin only)
  getAll: (status?: string): Promise<AxiosResponse<{ error: boolean, message: string, data: BusinessTripRequest[] }>> =>
    api.get(`/businesstrip/all${status ? `?status=${status}` : ''}`),

  // Get business trip request by ID
  getById: (id: string): Promise<AxiosResponse<{ error: boolean, message: string, data: BusinessTripRequest }>> =>
    api.get(`/businesstrip/${id}`),

  // Get business trip request by sequence number
  getBySequenceNumber: (sequenceNumber: number): Promise<AxiosResponse<{ error: boolean, message: string, data: BusinessTripRequest }>> =>
    api.get(`/businesstrip/sequence/${sequenceNumber}`),

  // Approve business trip request (HR/Admin only)
  approve: (id: string): Promise<AxiosResponse<{ error: boolean, message: string, data: BusinessTripRequest }>> =>
    api.put(`/businesstrip/${id}/approve`),

  // Reject business trip request (HR/Admin only)
  reject: (id: string, reason: string): Promise<AxiosResponse<{ error: boolean, message: string, data: BusinessTripRequest }>> =>
    api.put(`/businesstrip/${id}/reject`, { reason }),

  // Cancel business trip request
  cancel: (id: string, reason?: string): Promise<AxiosResponse<{ error: boolean, message: string, data: BusinessTripRequest }>> =>
    api.put(`/businesstrip/${id}/cancel`, reason ? { reason } : {}),

  // Get cancelled business trip requests (HR/Admin only)
  getCancelled: (employeeID?: string): Promise<AxiosResponse<{ error: boolean, message: string, data: BusinessTripRequest[] }>> =>
    api.get(`/businesstrip/cancelled/all${employeeID ? `?employeeID=${employeeID}` : ''}`)
};

// Convenience functions for business trip operations
export const createBusinessTripRequest = businessTripAPI.create;
export const getMyBusinessTripRequests = businessTripAPI.getMy;
export const getAllBusinessTripRequests = businessTripAPI.getAll;
export const getBusinessTripRequestById = businessTripAPI.getById;
export const approveBusinessTripRequest = businessTripAPI.approve;
export const rejectBusinessTripRequest = businessTripAPI.reject;
export const cancelBusinessTripRequest = businessTripAPI.cancel;
export const getCancelledBusinessTripRequests = businessTripAPI.getCancelled;