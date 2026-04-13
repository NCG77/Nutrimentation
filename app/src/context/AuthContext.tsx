"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('authToken');
        
        if (storedUser && storedToken) {
          const response = await fetch(
            process.env.REACT_APP_API_URL + '/auth/verify',
            {
              headers: { Authorization: `Bearer ${storedToken}` },
            }
          );
          
          if (response.ok) {
            setUser(JSON.parse(storedUser));
          } else {
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
          }
        }
      } catch (error) {
        console.error('Session restoration failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch(
        process.env.REACT_APP_API_URL + '/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        }
      );

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('authToken', data.token);
      
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        await fetch(process.env.REACT_APP_API_URL + '/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      setUser(null);
    }
  };

  const signup = async (username: string, email: string, password: string) => {
    try {
      const response = await fetch(
        process.env.REACT_APP_API_URL + '/auth/signup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        }
      );

      if (!response.ok) {
        throw new Error('Signup failed');
      }

      const data = await response.json();
      
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('authToken', data.token);
      
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        signup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
