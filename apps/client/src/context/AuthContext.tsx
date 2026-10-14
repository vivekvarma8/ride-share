import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { UserSummary } from '@rideshare/shared';

interface AuthContextType {
  user: UserSummary | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, role?: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    role: 'DRIVER' | 'PASSENGER';
    department?: string;
    phoneNumber?: string;
  }) => Promise<void>;
  loginWithGoogle: (idTokenOrEmail: string, role?: string, name?: string) => Promise<void>;
  loginWithDev?: (email: string, name?: string, department?: string, role?: string) => Promise<void>;
  becomeDriver: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const currentToken = localStorage.getItem('auth_token');
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; data: UserSummary }>('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        logout();
      }
    } catch (err) {
      console.warn('Failed to restore session:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string, role?: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: { token: string; user: UserSummary } }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, role }),
        },
      );

      if (res.success && res.data) {
        localStorage.setItem('auth_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    name: string;
    role: 'DRIVER' | 'PASSENGER';
    department?: string;
    phoneNumber?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: { token: string; user: UserSummary } }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      );

      if (res.success && res.data) {
        localStorage.setItem('auth_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (idTokenOrEmail: string, role?: string, name?: string) => {
    setIsLoading(true);
    try {
      const isEmail = idTokenOrEmail.includes('@');
      const body = isEmail
        ? { idToken: `google_verified_${idTokenOrEmail}`, email: idTokenOrEmail, name, role }
        : { idToken: idTokenOrEmail, role };

      const res = await apiRequest<{ success: boolean; data: { token: string; user: UserSummary } }>(
        '/auth/google',
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );

      if (res.success && res.data) {
        localStorage.setItem('auth_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const becomeDriver = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: { token: string; user: UserSummary } }>(
        '/auth/become-driver',
        {
          method: 'POST',
        },
      );

      if (res.success && res.data) {
        localStorage.setItem('auth_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        loginWithGoogle,
        becomeDriver,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
