'use client';

import { useState } from 'react';
import Login from '@/components/Login';
import Intro from '@/components/Intro';

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);

  if (!showIntro) {
    return <Login />;
  }

  return (
    <Intro
      onComplete={() => {
        setShowIntro(false);
      }}
    />
  );
} 