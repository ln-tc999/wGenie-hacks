'use client';

import Link from 'next/link';
import { Settings, Search, PanelLeft, PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CFO_NAV, isNavActive } from './cfo-nav';

export function CfoSidebar({
  pathname,
  collapsed,
  onToggle,
}: {
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-[#262626] bg-[#0D0D0D] transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
        'hidden lg:flex',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex items-center',
          collapsed ? 'justify-center p-4' : 'p-6',
        )}
      >
        {collapsed ? (
          <div className="size-6 rounded-full bg-[#C5FF4A]" />
        ) : (
          <>
            <Link href="/cfo" className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-[#C5FF4A]" />
              <span className="text-xl font-bold tracking-tight text-white">
                WalletGenie
              </span>
            </Link>
            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse sidebar"
              className="ml-auto text-[#8E8E8E] transition-colors hover:text-white"
            >
              <PanelLeft className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* Collapsed expand button */}
      {collapsed && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="mx-auto mb-6 flex items-center justify-center text-[#8E8E8E] transition-colors hover:text-white"
        >
          <PanelLeftClose className="size-5 rotate-180" />
        </button>
      )}

      {/* Search */}
      {!collapsed && (
        <div className="relative mb-8 px-6">
          <Search className="pointer-events-none absolute left-9 top-1/2 size-4 -translate-y-1/2 text-[#8E8E8E]" />
          <input
            type="text"
            placeholder="Search"
            className="w-full border-none bg-[#141414] py-2 pl-10 pr-4 text-sm text-white placeholder-[#8E8E8E] focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded border border-[#262626] bg-[#0D0D0D] px-1 text-xs text-[#8E8E8E]">
            /
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className={cn('flex-1 space-y-1', collapsed ? 'px-3' : 'px-3')}>
        {CFO_NAV.map(({ label, href, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-[#141414] font-medium text-white'
                  : 'text-[#8E8E8E] hover:text-white',
                collapsed && 'justify-center px-0',
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      {!collapsed && (
        <div className="mt-auto px-6 pb-6 pt-6">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 text-sm text-[#8E8E8E] transition-colors hover:text-white"
          >
            <Settings className="size-5" />
            Settings
          </a>
        </div>
      )}
    </aside>
  );
}
