import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../api/auth.api';
import { authApi } from '../api/auth.api';
import { useToast } from './ToastContext';
import { useRole } from './RoleContext';

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (userData: { email: string; password?: string; name: string; role?: UserRole }) => Promise<void>;
  logout: () => Promise<void>;
  quickLoginAs: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Demo persona email map matching backend seeds
export const DEMO_USERS: Record<UserRole, { email: string; name: string; institution: string }> = {
  REQUESTER: {
    email: 'sarah.chen@mit.edu',
    name: 'Dr. Sarah Chen',
    institution: 'Institute of Applied Technology',
  },
  MANAGER: {
    email: 'david.miller@harvard.edu',
    name: 'David Miller',
    institution: 'Digital Fabrication Lab',
  },
  COORDINATOR: {
    email: 'elena.rostova@mit.edu',
    name: 'Elena Rostova',
    institution: 'Cross-Institutional Exchange',
  },
  ADMIN: {
    email: 'marcus.vance@state.edu',
    name: 'Dean Marcus Vance',
    institution: 'Central Oversight',
  },
  COMMUNITY_PARTNER: {
    email: 'clara.oswald@boston-makers.org',
    name: 'Clara Oswald',
    institution: 'Boston Community Innovation Hub',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('accessToken');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();
  const { setRole } = useRole();

  // Validate session on boot
  useEffect(() => {
    async function initSession() {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.ok && res.data) {
            setUser(res.data);
            localStorage.setItem('currentUser', JSON.stringify(res.data));
            setRole(res.data.role);
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem('accessToken');
          localStorage.removeItem('currentUser');
          setUser(null);
          setAccessToken(null);
        }
      }
      setIsLoading(false);
    }

    initSession();
  }, [setRole]);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password: password || 'Password123!' });
      if (res.ok && res.data) {
        const { user: loggedInUser, accessToken: token } = res.data;
        setUser(loggedInUser);
        setAccessToken(token);
        localStorage.setItem('accessToken', token);
        localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
        setRole(loggedInUser.role);
        showToast({
          type: 'success',
          title: 'Signed In',
          message: `Welcome back, ${loggedInUser.name}!`,
        });
      }
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Login failed. Please check your credentials.';
      showToast({
        type: 'error',
        title: 'Authentication Failed',
        message,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { email: string; password?: string; name: string; role?: UserRole }) => {
    setIsLoading(true);
    try {
      const res = await authApi.register({
        ...userData,
        password: userData.password || 'Password123!',
      });
      if (res.ok && res.data) {
        const { user: registeredUser, accessToken: token } = res.data;
        setUser(registeredUser);
        setAccessToken(token);
        localStorage.setItem('accessToken', token);
        localStorage.setItem('currentUser', JSON.stringify(registeredUser));
        setRole(registeredUser.role);
        showToast({
          type: 'success',
          title: 'Account Registered',
          message: `Welcome to Resource Manager, ${registeredUser.name}!`,
        });
      }
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Registration failed.';
      showToast({
        type: 'error',
        title: 'Registration Error',
        message,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('currentUser');
      setUser(null);
      setAccessToken(null);
      showToast({
        type: 'info',
        title: 'Signed Out',
        message: 'You have been safely signed out.',
      });
    }
  };

  const quickLoginAs = async (targetRole: UserRole) => {
    const persona = DEMO_USERS[targetRole];
    if (!persona) return;
    try {
      await login(persona.email, 'Password123!');
    } catch {
      // If persona user is not yet seeded in DB, create simulated offline demo session
      const mockUser: User = {
        id: `demo_${targetRole.toLowerCase()}`,
        email: persona.email,
        name: persona.name,
        role: targetRole,
        institutionName: persona.institution,
      };
      setUser(mockUser);
      setAccessToken('demo_mock_jwt');
      localStorage.setItem('accessToken', 'demo_mock_jwt');
      localStorage.setItem('currentUser', JSON.stringify(mockUser));
      setRole(targetRole);
      showToast({
        type: 'info',
        title: 'Demo Persona Active',
        message: `Switched to ${persona.name} (${targetRole}) in sandbox mode.`,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        quickLoginAs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
