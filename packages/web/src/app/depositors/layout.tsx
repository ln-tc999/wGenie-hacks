'use client';

import { SidebarLayout } from '@/components/sidebar';
import { usePathname } from 'next/navigation';

export default function DepositorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '/depositors';

  return <SidebarLayout pathname={pathname}>{children}</SidebarLayout>;
}
