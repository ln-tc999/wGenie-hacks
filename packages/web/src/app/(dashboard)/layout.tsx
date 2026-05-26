'use client';

import { SidebarLayout } from '@/components/sidebar';
import { usePathname } from 'next/navigation';
import { getAppConfig } from '@/lib/app-config';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '/';
  const config = getAppConfig();

  // Landing page renders full-screen without sidebar
  if (config.id === 'yo' && pathname === '/') {
    return <>{children}</>;
  }

  return <SidebarLayout pathname={pathname}>{children}</SidebarLayout>;
}
