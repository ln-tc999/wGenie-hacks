import { getAppConfig, type NavItem } from '@/lib/app-config';

export type { NavItem };

export function getNavItems(): NavItem[] {
  return getAppConfig().navItems;
}

export function getActiveNavItem(pathname: string): string | undefined {
  const navItems = getNavItems();
  // Exact match first
  const exact = navItems.find((item) => item.url === pathname);
  if (exact) return exact.url;

  // Prefix match for nested routes (e.g., /vaults/123 matches /vaults)
  const prefix = navItems.find(
    (item) => item.url !== '/' && pathname.startsWith(item.url),
  );
  return prefix?.url;
}
