'use client';

import type { ReactNode } from 'react';
import Topbar from '../../components/Topbar';
import { SessionProvider } from '../../lib/session';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Topbar />
      {children}
    </SessionProvider>
  );
}
