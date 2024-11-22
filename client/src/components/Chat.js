'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Moon, Sun, Send, ArrowLeft, Mic, Paperclip, Image, File } from 'lucide-react';
import { useTheme } from 'next-themes';
import axios from 'axios';

export default function Chat() {
  const [message, setMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuth();
  const { socket, allUsers } = useSocket();
  const { theme, setTheme } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Filter users based on search query
  const filteredUsers = allUsers.filter(otherUser => 
    otherUser.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (otherUser.phone && otherUser.phone.includes(searchQuery))
  );

  useEffect(() => {
    if (socket) {
      // Handle incoming messages
      socket.on('newMessage', (message) => {
        console.log('Received new message:', message);
        setMessages(prev => [...prev, message]);
      });

      // Handle sent message confirmations
      socket.on('messageSent', (message) => {
        console.log('Message sent confirmation:', message);
        setMessages(prev => [...prev, message]);
      });

      // Handle message errors
      socket.on('messageError', (error) => {
        console.error('Message error:', error);
      });

      return () => {
        socket.off('newMessage');
        socket.off('messageSent');
        socket.off('messageError');
      };
    }
  }, [socket]);

  // Fetch message history when selecting a user
  useEffect(() => {
    if (selectedUser && socket) {
      socket.emit('getMessageHistory', { otherUserId: selectedUser.id });
      
      const handleMessageHistory = (messages) => {
        console.log('Received message history:', messages);
        setMessages(messages);
      };

      socket.on('messageHistory', handleMessageHistory);

      return () => {
        socket.off('messageHistory', handleMessageHistory);
      };
    }
  }, [selectedUser, socket]);

  const sendMessage = async () => {
    if (!selectedUser || !socket || !message.trim()) return;

    try {
      console.log('Sending message to:', selectedUser.username);
      socket.emit('privateMessage', {
        recipientId: selectedUser.id,
        content: message.trim(),
        messageType: 'text'
      });

      // Add message to local state immediately
      const newMessage = {
        id: Date.now(), // Temporary ID
        sender_id: user.id,
        recipient_id: selectedUser.id,
        content: message.trim(),
        message_type: 'text',
        created_at: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
      setMessage(''); // Clear input after sending
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Handle media upload
  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingMedia(true);
      const formData = new FormData();
      formData.append('media', file);

      const res = await axios.post('http://localhost:5000/api/messages/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-auth-token': localStorage.getItem('token')
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log('Upload progress:', percentCompleted);
        }
      });

      // Send message with media
      socket.emit('privateMessage', {
        recipientId: selectedUser.id,
        content: file.name,
        messageType: file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('video/') ? 'video' : 'file',
        mediaUrl: res.data.url
      });
    } catch (err) {
      console.error('Error uploading media:', err);
    } finally {
      setUploadingMedia(false);
      // Clear the input
      e.target.value = '';
    }
  };

  // Handle voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('media', audioBlob, 'voice-message.wav');

        try {
          const res = await axios.post('http://localhost:5000/api/messages/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'x-auth-token': localStorage.getItem('token')
            }
          });

          socket.emit('privateMessage', {
            recipientId: selectedUser.id,
            content: 'Voice message',
            messageType: 'voice',
            mediaUrl: res.data.url
          });
        } catch (err) {
          console.error('Error uploading voice message:', err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // Render message content based on type
  const renderMessage = (msg) => {
    switch (msg.message_type) {
      case 'image':
        return (
          <div className="max-w-sm">
            <img 
              src={`http://localhost:5000${msg.media_url}`}
              alt="Image" 
              className="rounded-lg w-full h-auto object-cover cursor-pointer"
              onClick={() => window.open(`http://localhost:5000${msg.media_url}`, '_blank')}
            />
          </div>
        );
      case 'video':
        return (
          <video 
            controls 
            className="max-w-sm rounded-lg"
          >
            <source src={`http://localhost:5000${msg.media_url}`} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        );
      case 'voice':
        return (
          <audio controls className="max-w-xs">
            <source src={`http://localhost:5000${msg.media_url}`} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        );
      case 'file':
        return (
          <a 
            href={`http://localhost:5000${msg.media_url}`}
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center space-x-2 text-blue-400 hover:text-blue-300"
          >
            <File className="h-4 w-4" />
            <span>{msg.content}</span>
          </a>
        );
      default:
        return msg.content;
    }
  };

  // Render Users List Page
  if (!selectedUser) {
    return (
      <div className={theme}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="max-w-2xl mx-auto p-4">
            {/* Header with Current User */}
            <div className="flex justify-between items-center mb-6 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-lg">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={user?.avatar || `/placeholder.svg`} />
                  <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Welcome, {user?.username}</h1>
                  <p className="text-sm text-green-500">Online</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" onClick={logout}>Logout</Button>
              </div>
            </div>

            {/* Search Input */}
            <div className="mb-6">
              <Input
                type="text"
                placeholder="Search users by username or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-lg"
              />
            </div>

            {/* Users List */}
            <div className="space-y-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((otherUser) => (
                  <motion.div
                    key={otherUser.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-lg cursor-pointer hover:bg-white/90 dark:hover:bg-gray-700/90 transition-all"
                    onClick={() => setSelectedUser(otherUser)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={otherUser.avatar || `/placeholder.svg`} />
                          <AvatarFallback>{otherUser.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">{otherUser.username}</p>
                          {otherUser.phone && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{otherUser.phone}</p>
                          )}
                          <p className={`text-sm ${otherUser.online ? 'text-green-500' : 'text-gray-500'}`}>
                            {otherUser.online ? 'Online' : 'Offline'}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost">Message</Button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No users found' : 'No registered users'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Chat Page
  return (
    <div className={theme}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-2xl mx-auto p-4">
          {/* Chat Header with Current User and Selected User */}
          <div className="flex items-center justify-between mb-6 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-lg">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => setSelectedUser(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={selectedUser.avatar || `/placeholder.svg`} />
                  <AvatarFallback>{selectedUser.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{selectedUser.username}</p>
                  <p className={`text-sm ${selectedUser.online ? 'text-green-500' : 'text-gray-500'}`}>
                    {selectedUser.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800 dark:text-white">{user?.username}</p>
                <p className="text-xs text-green-500">Online</p>
              </div>
              <Avatar>
                <AvatarImage src={user?.avatar || `/placeholder.svg`} />
                <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="h-[calc(100vh-250px)] mb-4 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-lg">
            {messages.map((msg, index) => (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'} mb-4`}
              >
                <div className={`message-bubble ${
                  msg.sender_id === user.id ? 'message-sent' : 'message-received'
                }`}>
                  {renderMessage(msg)}
                </div>
              </motion.div>
            ))}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-lg">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }} 
              className="flex items-center space-x-2"
            >
              {/* Media Upload Button */}
              <input
                type="file"
                id="media-upload"
                hidden
                onChange={handleMediaUpload}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => document.getElementById('media-upload').click()}
                className="text-gray-600 dark:text-gray-300"
                disabled={uploadingMedia}
              >
                <Paperclip className="h-5 w-5" />
              </Button>

              {/* Voice Recording Button */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                className={`text-gray-600 dark:text-gray-300 ${isRecording ? 'bg-red-500/50 animate-pulse' : ''}`}
              >
                <Mic className="h-5 w-5" />
              </Button>

              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit" disabled={!message.trim() && !uploadingMedia}>
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 