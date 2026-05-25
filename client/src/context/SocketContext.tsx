import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user, token } = useAuth(); // Hook directly into our global auth state

  useEffect(() => {
    // Only establish a persistent connection if a user is authenticated
    if (user && token) {
      const socketInstance = io('http://localhost:5000', {
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
    } else if (socket) {
      // Fallback disconnect if logout is triggered mid-session
      socket.disconnect();
      setSocket(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

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
