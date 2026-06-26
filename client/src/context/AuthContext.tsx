import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';

interface User {
  username: string;
  _id?: string;
  karmaPoints?: number;
  role?: 'user' | 'police' | 'admin';
  policeStationName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginUser: (username: string, password: string) => Promise<void>;
  registerUser: (username: string, password: string) => Promise<void>;
  loginWithGoogle: (token: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const fetchMe = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data && response.data.user) {
          setUser({ 
            username: response.data.user.username, 
            _id: response.data.user._id,
            karmaPoints: response.data.user.karmaPoints,
            role: response.data.user.role,
            policeStationName: response.data.user.policeStationName
          });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

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
      
      // Fetch latest profile to get Karma Points
      api.get('/auth/me', { headers: { Authorization: `Bearer ${storedToken}` } })
        .then(res => {
          if (res.data && res.data.user) {
            setUser({ 
              username: res.data.user.username, 
              _id: res.data.user._id,
              karmaPoints: res.data.user.karmaPoints,
              role: res.data.user.role,
              policeStationName: res.data.user.policeStationName
            });
          }
        })
        .catch(err => console.error('Failed to fetch user:', err));
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
      const { token: receivedToken, username: receivedUsername, userId, role, policeStationName } = response.data;

      // Update local state (karma will be 0 initially or updated via fetchMe)
      setToken(receivedToken);
      setUser({ username: receivedUsername, _id: userId, role, policeStationName });
      fetchMe(); // fetch karma points

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

  const loginWithGoogle = async (googleToken: string) => {
    try {
      const response = await api.post('/auth/google', { token: googleToken });
      const { token: receivedToken, username: receivedUsername, userId, role, policeStationName } = response.data;

      setToken(receivedToken);
      setUser({ username: receivedUsername, _id: userId, role, policeStationName });
      fetchMe();

      localStorage.setItem('token', receivedToken);
      localStorage.setItem('username', receivedUsername);
      if (userId) localStorage.setItem('userId', userId);

      Swal.fire({
        title: 'Welcome Back!',
        text: `Successfully logged in with Google as ${receivedUsername}.`,
        icon: 'success',
        confirmButtonColor: '#800000',
        timer: 2000,
        showConfirmButton: false
      });

      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Google Login failed.';
      Swal.fire({
        title: 'Error!',
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
    <AuthContext.Provider value={{ user, token, loading, loginUser, registerUser, loginWithGoogle, fetchMe, logout }}>
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
