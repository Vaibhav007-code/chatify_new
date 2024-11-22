'use client';

import { useState, useEffect } from 'react';
import Login from '@/components/Login';
import Chat from '@/components/Chat';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  // If no user is logged in, show the login page
  if (!user) {
    return <Login />;
  }

  // If user is logged in, show the chat interface
  return <Chat />;
}