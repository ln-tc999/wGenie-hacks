'use client';

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from './app-sidebar';
import { BottomNav } from './bottom-nav';
import { SidebarUser } from './sidebar-user';
import { ConnectWalletButton } from './connect-wallet-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { getAppConfig } from '@/lib/app-config';

interface SidebarLayoutProps {
  children: React.ReactNode;
  pathname: string;
}

export function SidebarLayout({ children, pathname }: SidebarLayoutProps) {
  const config = getAppConfig();

  return (
    <SidebarProvider>
      <AppSidebar pathname={pathname} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 md:h-16">
          <SidebarTrigger className="-ml-1 hidden md:flex" />
          <Separator
            orientation="vertical"
            className="mr-2 hidden h-4 md:block"
          />
          <img
            src={config.logo}
            alt={config.name}
            className="h-8 w-auto md:hidden"
          />
          <div className="ml-auto flex items-center gap-2">
            {config.id !== 'yo' && <ThemeToggle />}
            <ConnectWalletButton />
            <SidebarUser />
          </div>
        </header>
        <div className="flex-1 pb-16 md:pb-0">{children}</div>
      </SidebarInset>
      <BottomNav pathname={pathname} />
    </SidebarProvider>
  );
}
