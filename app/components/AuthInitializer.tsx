'use client';

import { useEffect } from 'react';
import { AuthService } from '@/lib/auth';

export default function AuthInitializer() {
  useEffect(() => {
    // Force initialization on app load
    AuthService.initializeUsers();
  }, []);

  return null; // This component doesn't render anything
}