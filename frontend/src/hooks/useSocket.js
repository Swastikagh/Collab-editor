import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Custom hook that creates and manages a Socket.io connection
// We use useRef so the socket persists across re-renders without causing them
export const useSocket = (roomId) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // Connect to backend WebSocket server
    // auth.token is how we authenticate the WebSocket connection
    socketRef.current = io('http://localhost:5000', {
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected:', socketRef.current.id);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('WebSocket error:', err.message);
    });

    // Cleanup: disconnect when component unmounts
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [roomId]);

  return socketRef;
};
