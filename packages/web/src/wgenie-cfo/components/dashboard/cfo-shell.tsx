'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { CfoSidebar } from './cfo-sidebar';
import { CfoHeader } from './cfo-header';
import { titleForPath } from './cfo-nav';
import { TreasuryProvider } from './treasury-provider';

export function CfoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/cfo';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0D0D0D] font-sans text-white">
      <CfoSidebar
        pathname={pathname}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        <CfoHeader title={titleForPath(pathname)} />
        <div className="flex-1 overflow-hidden">
          <TreasuryProvider>{children}</TreasuryProvider>
        </div>
      </main>
    </div>
  );
}
