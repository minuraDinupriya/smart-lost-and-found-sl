import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

interface User {
  username: string;
  _id?: string;
  karmaPoints?: number;
  role?: 'user' | 'police' | 'admin';
  policeStationName?: string;
  profilePicture?: string;
  bankDetails?: {
    bankName: string;
    branchName: string;
    accountName: string;
    accountNumber: string;
  };
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
  const location = useLocation();
  // Only restore internal destinations supplied by the page that required sign-in.
  const requestedPath = location.state?.from;
  const returnTo =
    typeof requestedPath === 'string' &&
    requestedPath.startsWith('/') &&
    !requestedPath.startsWith('//') &&
    !requestedPath.includes('\\')
      ? requestedPath
      : '/';

  const fetchMe = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data && response.data.user) {
        setUser({
          username: response.data.user.username,
          _id: response.data.user._id,
          karmaPoints: response.data.user.karmaPoints,
          role: response.data.user.role,
          policeStationName: response.data.user.policeStationName,
          profilePicture: response.data.user.profilePicture,
          bankDetails: response.data.user.bankDetails,
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
        } catch (e) {}
      }
      setToken(storedToken);
      setUser({ username: storedUsername, _id: decodedId || undefined });

      // Fetch latest profile to get Karma points
      api
        .get('/auth/me', { headers: { Authorization: `Bearer ${storedToken}` } })
        .then((res) => {
          if (res.data && res.data.user) {
            setUser({
              username: res.data.user.username,
              _id: res.data.user._id,
              karmaPoints: res.data.user.karmaPoints,
              role: res.data.user.role,
              policeStationName: res.data.user.policeStationName,
              profilePicture: res.data.user.profilePicture,
              bankDetails: res.data.user.bankDetails,
            });
          }
        })
        .catch((error) => {
          if (error.response?.status !== 401 && error.response?.status !== 403) return;
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          localStorage.removeItem('userId');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const registerUser = async (username: string, password: string) => {
    await api.post('/auth/register', { username, password });
    navigate('/login', { replace: true, state: { registered: true, from: returnTo } });
  };

  const completeLogin = async (data: any) => {
    const {
      token: receivedToken,
      username,
      userId,
      role,
      policeStationName,
      profilePicture,
    } = data;
    localStorage.setItem('token', receivedToken);
    localStorage.setItem('username', username);
    if (userId) localStorage.setItem('userId', userId);
    setToken(receivedToken);
    setUser({ username, _id: userId, role, policeStationName, profilePicture });
    await fetchMe();
    navigate(returnTo, { replace: true });
  };

  const loginUser = async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    await completeLogin(response.data);
  };

  const loginWithGoogle = async (googleToken: string) => {
    const response = await api.post('/auth/google', { token: googleToken });
    await completeLogin(response.data);
  };

  const logout = () => {
    // Clear state arrays
    setToken(null);
    setUser(null);

    // Wipe persistent storage
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');

    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, loginUser, registerUser, loginWithGoogle, fetchMe, logout }}
    >
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
