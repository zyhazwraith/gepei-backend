/**
 * 认证Context
 * 管理用户登录状态和用户信息
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, User, ApiResponse } from '../lib/api';
import { getToken, removeToken, setToken as saveToken } from '../utils/token';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (token: string, userInfo?: User) => Promise<User | null>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取用户信息
  const fetchUser = async (): Promise<User | null> => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return null;
    }

    try {
      const response: ApiResponse<User> = await getCurrentUser();
      if (response.code === 0 && response.data) {
        setUser(response.data);
        return response.data;
      } else {
        removeToken();
        return null;
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      removeToken();
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取用户信息
  useEffect(() => {
    fetchUser();
  }, []);

  // 登录 - 保存Token并获取用户信息
  const login = async (token: string, userInfo?: User): Promise<User | null> => {
    saveToken(token);
    
    // 如果直接提供了用户信息（例如从登录响应中获取），则直接使用，减少一次请求
    if (userInfo) {
      setUser(userInfo);
      return userInfo;
    }
    
    // 否则重新获取
    return await fetchUser();
  };

  // 登出 - 清除Token和用户信息
  const logout = () => {
    removeToken();
    setUser(null);
  };

  // 重新获取用户信息
  const refetchUser = async () => {
    await fetchUser();
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook: 使用认证Context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
