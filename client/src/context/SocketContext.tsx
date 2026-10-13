import React, { createContext, useContext } from 'react';

/**
 * Lightweight event stub replacing Socket.IO WebSocket connections.
 * Firebase Hosting + Cloud Functions are stateless and do not serve a WebSocket endpoint at `/socket.io`.
 * Submission verdicts and daily leaderboard updates use visibility-aware HTTP polling and manual refresh.
 */
export interface RealtimeClientStub {
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
}

interface SocketContextType {
  socket: RealtimeClientStub | null;
  isConnected: boolean;
}

const noopSocket: RealtimeClientStub = {
  on: () => {},
  off: () => {},
  emit: () => {},
};

const SocketContext = createContext<SocketContextType>({
  socket: noopSocket,
  isConnected: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SocketContext.Provider value={{ socket: noopSocket, isConnected: false }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
