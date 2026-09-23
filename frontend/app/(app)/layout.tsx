'use client';

import type { ReactNode } from 'react';
import ChatWidget from '../../components/ChatWidget';
import Topbar from '../../components/Topbar';
import { SessionProvider } from '../../lib/session';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Topbar />
      {children}
      <ChatWidget />
    </SessionProvider>
  );
}
