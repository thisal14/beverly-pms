import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { setApiAuthToken } from '../api/axios';
import api from '../api/axios';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Auto-login flow using httpOnly refresh token
    api.post('/auth/refresh')
      .then((res: any) => {
        setApiAuthToken(res.data.accessToken);
        // Minimal user info from token payload. 
        // In a real app we might GET /api/users/me here.
        try {
          const payload = JSON.parse(atob(res.data.accessToken.split('.')[1]));
          setUser({
             id: payload.id, 
             role: payload.role as UserRole, 
             hotel_id: payload.hotel_id, 
             name: 'Current User', 
             email: '', 
             is_active: true, 
             created_at: ''
          } as User);
        } catch (e) {}
      })
      .catch(() => {
        setApiAuthToken(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = (token: string, userData: User) => {
    setApiAuthToken(token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    setApiAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
