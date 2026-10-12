import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService, clearAuthToken, getAuthToken, googleAuthService } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginWithGoogle: (handoffToken: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password?: string;
    college: string;
    department: string;
    yearOfStudy: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    authService.getCurrentUser()
      .then((user) => {
        setCurrentUser(user);
      })
      .catch(() => {
        // Token invalid or expired, clear it
        clearAuthToken();
        setCurrentUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const { user } = await authService.login(email, password);
      setCurrentUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (handoffToken: string) => {
    setIsLoading(true);
    try {
      const user = await googleAuthService.exchangeHandoff(handoffToken);
      setCurrentUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password?: string;
    college: string;
    department: string;
    yearOfStudy: string;
    phone?: string;
  }) => {
    setIsLoading(true);
    try {
      const { user } = await authService.register(data);
      setCurrentUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    setCurrentUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const updated = await authService.updateProfile(data);
      setCurrentUser(updated);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        loginWithGoogle,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
