'use client';

import { SidebarLayout } from '@/components/sidebar';
import { usePathname } from 'next/navigation';

export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '/activity';

  return <SidebarLayout pathname={pathname}>{children}</SidebarLayout>;
}
