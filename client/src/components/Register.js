'use client';

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Register() {
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await register(username, phone, password);
      router.push('/chat');
    } catch (err) {
      setError(err.message || 'Failed to create an account');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 to-yellow-500">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/20 backdrop-blur-lg p-8 rounded-lg shadow-xl">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Create Account</h2>
          
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 text-white p-3 rounded-lg mb-4 text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Input
                type="text"
                placeholder="Name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 text-white placeholder-white/60 rounded-lg"
                required
              />
            </div>
            <div>
              <Input
                type="tel"
                placeholder="Phone Number (with country code)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 text-white placeholder-white/60 rounded-lg"
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 text-white placeholder-white/60 rounded-lg"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </Button>
          </form>

          <div className="mt-6 text-center text-white">
            Already have an account?{' '}
            <Link href="/login" className="text-red-300 hover:text-red-200">
              Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 