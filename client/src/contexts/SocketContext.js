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
      
      // Update users with online status from connectedUsers
      const updatedUsers = otherUsers.map(u => ({
        ...u,
        online: onlineUsers.some(ou => ou.id === u.id)
      }));
      
      console.log('Current user:', user.username);
      console.log('All registered users:', updatedUsers);
      setAllUsers(updatedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    if (user) {
      const newSocket = io(`${process.env.NEXT_PUBLIC_API_URL}`, {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      newSocket.on('connect', () => {
        console.log('Socket connected for user:', user.username);
        newSocket.emit('userConnected', {
          userId: user.id,
          username: user.username
        });
        fetchAllUsers(); // Initial fetch
      });

      // Handle user lists updates
      newSocket.on('userLists', ({ allUsers: serverAllUsers, onlineUsers: serverOnlineUsers }) => {
        console.log('Received user lists update:', { serverAllUsers, serverOnlineUsers });
        
        // Filter out current user from both lists
        const otherUsers = serverAllUsers.filter(u => u.id !== user.id);
        const otherOnlineUsers = serverOnlineUsers.filter(u => u.id !== user.id);
        
        // Update states with correct online status
        setAllUsers(otherUsers.map(u => ({
          ...u,
          online: otherOnlineUsers.some(ou => ou.id === u.id)
        })));
        setOnlineUsers(otherOnlineUsers);
      });

      // Handle user online status
      newSocket.on('userOnline', ({ userId, username }) => {
        console.log('User came online:', username);
        setAllUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, online: true } : u
        ));
        setOnlineUsers(prev => {
          const isAlreadyOnline = prev.some(u => u.id === userId);
          if (!isAlreadyOnline) {
            return [...prev, { id: userId, username, online: true }];
          }
          return prev;
        });
      });

      newSocket.on('userOffline', ({ userId }) => {
        console.log('User went offline:', userId);
        setAllUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, online: false } : u
        ));
        setOnlineUsers(prev => prev.filter(u => u.id !== userId));
      });

      // Handle disconnection
      window.addEventListener('beforeunload', () => {
        newSocket.emit('userDisconnected', {
          userId: user.id,
          username: user.username
        });
      });

      setSocket(newSocket);

      return () => {
        if (newSocket) {
          newSocket.emit('userDisconnected', {
            userId: user.id,
            username: user.username
          });
          newSocket.disconnect();
        }
      };
    }
  }, [user]);

  // Periodically fetch all users to keep list synchronized
  useEffect(() => {
    if (user) {
      const interval = setInterval(fetchAllUsers, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ 
      socket, 
      onlineUsers,
      allUsers,
      currentUser: user,
      refreshUsers: fetchAllUsers
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);