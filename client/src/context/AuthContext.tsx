import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { isAxiosError } from 'axios';
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

interface LoginResponse {
  token: string;
  username: string;
  userId?: string;
  role?: User['role'];
  policeStationName?: string;
  profilePicture?: string;
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
  const profileRequest = useRef<AbortController | null>(null);
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

  const clearSession = useCallback(() => {
    profileRequest.current?.abort();
    profileRequest.current = null;
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  const fetchMe = useCallback(async () => {
    if (!localStorage.getItem('token')) return;

    // A profile response belongs to the session that started the request.
    profileRequest.current?.abort();
    const request = new AbortController();
    profileRequest.current = request;

    try {
      const { data } = await api.get<{ user: User | null }>('/auth/me', { signal: request.signal });
      if (request.signal.aborted || !data?.user) return;

      const { username, _id, karmaPoints, role, policeStationName, profilePicture, bankDetails } = data.user;
      setUser({ username, _id, karmaPoints, role, policeStationName, profilePicture, bankDetails });
    } catch (error) {
      if (request.signal.aborted) return;

      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403) {
        clearSession();
      } else {
        console.error('Unable to refresh account details.');
      }
    } finally {
      if (profileRequest.current === request) {
        profileRequest.current = null;
        setLoading(false);
      }
    }
  }, [clearSession]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    const storedUserId = localStorage.getItem('userId');

    if (storedToken && storedUsername) {
      let decodedId = storedUserId;
      if (!decodedId) {
        try {
          decodedId = JSON.parse(atob(storedToken.split('.')[1])).id;
        } catch {
          // The profile request can supply the ID for older saved sessions.
        }
      }
      setToken(storedToken);
      setUser({ username: storedUsername, _id: decodedId || undefined });
      void fetchMe();
    } else {
      setLoading(false);
    }

    return () => {
      profileRequest.current?.abort();
      profileRequest.current = null;
    };
  }, [fetchMe]);

  const registerUser = async (username: string, password: string) => {
    await api.post('/auth/register', { username, password });
    navigate('/login', { replace: true, state: { registered: true, from: returnTo } });
  };

  const completeLogin = (data: LoginResponse) => {
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
    else localStorage.removeItem('userId');
    setToken(receivedToken);
    setUser({ username, _id: userId, role, policeStationName, profilePicture });
    setLoading(false);
    void fetchMe();
    navigate(returnTo, { replace: true });
  };

  const loginUser = async (username: string, password: string) => {
    const response = await api.post<LoginResponse>('/auth/login', { username, password });
    completeLogin(response.data);
  };

  const loginWithGoogle = async (googleToken: string) => {
    const response = await api.post<LoginResponse>('/auth/google', { token: googleToken });
    completeLogin(response.data);
  };

  const logout = () => {
    clearSession();

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
