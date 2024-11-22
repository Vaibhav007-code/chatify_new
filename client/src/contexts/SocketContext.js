'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import axios from 'axios';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const { user } = useAuth();

  // Function to fetch all registered users
  const fetchAllUsers = async () => {
    if (!user) return;
    
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/users`, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      // Get all users except current user
      const otherUsers = res.data.filter(u => u.id !== user.id);
      setAllUsers(otherUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Initialize socket connection when user logs in
  useEffect(() => {
    if (user && !socket) {
      const newSocket = io(process.env.NEXT_PUBLIC_API_URL, {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to socket server');
        newSocket.emit('login', user.id);
      });

      newSocket.on('userOnline', ({ userId, username }) => {
        setOnlineUsers(prev => [...prev, userId]);
        fetchAllUsers(); // Refresh user list when someone comes online
      });

      newSocket.on('userOffline', ({ userId }) => {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
        fetchAllUsers(); // Refresh user list when someone goes offline
      });

      setSocket(newSocket);
      fetchAllUsers(); // Initial fetch of users
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user]);

  // Refresh users list periodically
  useEffect(() => {
    if (user) {
      const interval = setInterval(fetchAllUsers, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const value = {
    socket,
    onlineUsers,
    allUsers,
    fetchAllUsers
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}