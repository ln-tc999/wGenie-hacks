import {
  LayoutDashboard,
  Landmark,
  Target,
  Activity,
  Bot,
  type LucideIcon,
} from 'lucide-react';

export type CfoNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** header title for the route (defaults to label) */
  title?: string;
};

export const CFO_NAV: CfoNavItem[] = [
  { label: 'Dashboard', href: '/cfo', icon: LayoutDashboard },
  { label: 'Treasury', href: '/cfo/treasury', icon: Landmark },
  { label: 'Vaults', href: '/cfo/vaults', icon: Landmark },
  { label: 'Strategy', href: '/cfo/strategy', icon: Target },
  { label: 'Activity', href: '/cfo/activity', icon: Activity },
  { label: 'Agent', href: '/cfo/agent', icon: Bot, title: 'AI Agent' },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/cfo') return pathname === '/cfo';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function titleForPath(pathname: string): string {
  const item = [...CFO_NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => isNavActive(pathname, i.href));
  return item?.title ?? item?.label ?? 'Dashboard';
}
