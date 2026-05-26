import { getNavItems, getActiveNavItem } from './nav-config';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  pathname: string;
}

export function BottomNav({ pathname }: BottomNavProps) {
  const activeUrl = getActiveNavItem(pathname);
  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = item.url === activeUrl;
          return (
            <a
              key={item.title}
              href={item.url}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
