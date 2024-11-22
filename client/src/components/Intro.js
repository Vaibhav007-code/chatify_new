'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function Intro({ onComplete }) {
  const [showCreator, setShowCreator] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCreator(true), 2000);
    const completeTimer = setTimeout(onComplete, 4500);

    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  // Typewriter animation for letters
  const titleLetters = "Chatify".split("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] overflow-hidden perspective-1000">
      {/* Cinematic background with moving gradients */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-900 via-black to-purple-900"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'linear',
          }}
        />
        
        {/* Animated light beams */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-[200%] w-[20px] bg-gradient-to-b from-transparent via-blue-500/20 to-transparent"
              style={{
                left: `${30 * i + 20}%`,
                transform: 'rotate(45deg)',
              }}
              animate={{
                y: ['-200%', '0%'],
              }}
              transition={{
                duration: 3.5 + i,
                repeat: Infinity,
                ease: 'linear',
                delay: i * 0.5,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative text-center z-10">
        {/* Chatify Title with Typewriter Effect */}
        <motion.div className="mb-8 relative">
          <div className="flex justify-center mb-4">
            {titleLetters.map((letter, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.1,
                  ease: [0.23, 1, 0.32, 1]
                }}
                className="text-8xl font-bold text-[#E50914] inline-block"
                style={{
                  textShadow: '0 0 20px rgba(229, 9, 20, 0.5), 0 0 40px rgba(229, 9, 20, 0.3)'
                }}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* Tagline with cinematic reveal */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ 
              delay: 1,
              duration: 0.8,
              ease: [0.23, 1, 0.32, 1]
            }}
            className="relative overflow-hidden"
          >
            <motion.p
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ 
                delay: 1.2,
                duration: 0.8,
                ease: [0.23, 1, 0.32, 1]
              }}
              className="text-2xl font-medium text-blue-400"
              style={{
                textShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
              }}
            >
              Connect. Chat. Create.
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Creator credit with cinematic animation */}
        {showCreator && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            className="relative"
          >
            <p className="text-xl text-gray-400">
              Created by{' '}
              <motion.span
                className="inline-block font-bold text-yellow-400"
                initial={{ scale: 1 }}
                animate={{ 
                  scale: [1, 1.2, 1],
                  textShadow: [
                    '0 0 20px rgba(250, 204, 21, 0.5)',
                    '0 0 40px rgba(250, 204, 21, 0.8)',
                    '0 0 20px rgba(250, 204, 21, 0.5)'
                  ]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                VAIBHAV
              </motion.span>
            </p>
          </motion.div>
        )}

        {/* Cinematic particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/50 rounded-full"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                y: [0, -100],
                x: [0, Math.random() * 50 - 25],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
} 