import { api } from './client';

export type UserRole = 'REQUESTER' | 'MANAGER' | 'COORDINATOR' | 'ADMIN' | 'COMMUNITY_PARTNER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  institutionId?: string;
  institutionName?: string;
  department?: string;
  phone?: string;
}

export interface AuthResponseData {
  user: User;
  accessToken: string;
}

export interface RegisterResponseData {
  message: string;
  demoOtp?: string;
  demoNote?: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const authApi = {
  login: async (credentials: { email: string; password?: string }) => {
    const res = await api.post<ApiResponse<AuthResponseData>>('/auth/login', credentials);
    return res.data;
  },

  register: async (userData: {
    email: string;
    password?: string;
    name: string;
    institutionId?: string;
    role?: UserRole;
  }) => {
    const res = await api.post<ApiResponse<RegisterResponseData>>('/auth/register', userData);
    return res.data;
  },

  verifyOtp: async (data: { email: string; otp: string }) => {
    const res = await api.post<ApiResponse<AuthResponseData>>('/auth/verify-otp', data);
    return res.data;
  },

  getMe: async () => {
    const res = await api.get<ApiResponse<User>>('/auth/me');
    return res.data;
  },

  logout: async () => {
    const res = await api.post<ApiResponse<{ message: string }>>('/auth/logout');
    return res.data;
  },
};
