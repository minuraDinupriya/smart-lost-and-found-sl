import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';

interface User {
  username: string;
  _id?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginUser: (username: string, password: string) => Promise<void>;
  registerUser: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // On mount, check if token exists in localStorage to maintain persistence
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    const storedUserId = localStorage.getItem('userId');
    
    if (storedToken && storedUsername) {
      let decodedId = storedUserId;
      if (!decodedId && storedToken) {
        try {
          decodedId = JSON.parse(atob(storedToken.split('.')[1])).id;
        } catch(e) {}
      }
      setToken(storedToken);
      setUser({ username: storedUsername, _id: decodedId || undefined });
    }
    
    setLoading(false);
  }, []);

  const registerUser = async (username: string, password: string) => {
    try {
      await api.post('/auth/register', { username, password });
      
      Swal.fire({
        title: 'Registration Successful!',
        text: 'You can now login with your credentials.',
        icon: 'success',
        confirmButtonColor: '#800000', // Maroon Brand Color
      });
      
      navigate('/login');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      Swal.fire({
        title: 'Error!',
        text: message,
        icon: 'error',
        confirmButtonColor: '#800000',
      });
      throw error;
    }
  };

  const loginUser = async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token: receivedToken, username: receivedUsername, userId } = response.data;

      // Update local state
      setToken(receivedToken);
      setUser({ username: receivedUsername, _id: userId });

      // Persist in localStorage
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('username', receivedUsername);
      if (userId) localStorage.setItem('userId', userId);

      Swal.fire({
        title: 'Welcome Back!',
        text: `Successfully logged in as ${receivedUsername}.`,
        icon: 'success',
        confirmButtonColor: '#800000',
        timer: 2000,
        showConfirmButton: false
      });

      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Invalid credentials.';
      Swal.fire({
        title: 'Login Failed!',
        text: message,
        icon: 'error',
        confirmButtonColor: '#800000',
      });
      throw error;
    }
  };

  const logout = () => {
    // Clear state arrays
    setToken(null);
    setUser(null);

    // Wipe persistent storage
    localStorage.removeItem('token');
    localStorage.removeItem('username');

    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginUser, registerUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider. Ensure your app is wrapped.');
  }
  return context;
};
