'use client';

import { SidebarLayout } from '@/components/sidebar';
import { usePathname } from 'next/navigation';

export default function VaultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '/vaults';

  return <SidebarLayout pathname={pathname}>{children}</SidebarLayout>;
}
