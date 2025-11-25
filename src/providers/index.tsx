'use client';

import type { ReactNode } from 'react';

import { AuthProvider } from '@/hooks/use-auth';
import { ToastProvider } from '@/components/ui';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}
