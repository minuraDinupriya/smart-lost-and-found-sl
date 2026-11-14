import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user, token } = useAuth();
  const userId = user?._id;

  useEffect(() => {
    // Only establish a persistent connection if a user is authenticated
    if (userId && token) {
      const socketBaseUrl = import.meta.env.VITE_API_URL 
        ? import.meta.env.VITE_API_URL.replace('/api', '') 
        : 'http://localhost:5001';
        
      const socketInstance = io(socketBaseUrl, {
        auth: {
          token // Securely pass the JWT token for future backend Socket middleware
        }
      });

      setSocket(socketInstance);

      // Graceful cleanup: disconnect when component unmounts or auth state drops
      return () => {
        socketInstance.disconnect();
        setSocket(null);
      };
    }
  }, [userId, token]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider.');
  }
  return context;
};
