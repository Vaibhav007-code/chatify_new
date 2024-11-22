'use client';

import { useState, useEffect } from 'react';
import Login from '@/components/Login';
import Register from '@/components/Register';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import dynamic from 'next/dynamic';

// Dynamically import Chat component with no SSR
const Chat = dynamic(() => import('@/components/Chat'), { ssr: false });

export default function Home() {
  return (
    <AuthProvider>
      <SocketProvider>
        <main className="min-h-screen">
          <Tabs defaultValue="register" className="w-full">
            <TabsList className="hidden">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Login />
            </TabsContent>
            <TabsContent value="register">
              <Register />
            </TabsContent>
            <TabsContent value="chat">
              <Chat />
            </TabsContent>
          </Tabs>
        </main>
      </SocketProvider>
    </AuthProvider>
  );
}