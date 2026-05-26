import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { NavMain } from './nav-main';
import { getNavItems, getActiveNavItem } from './nav-config';
import { getAppConfig } from '@/lib/app-config';
import { ThemeToggle } from '@/components/theme-toggle';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  pathname: string;
}

export function AppSidebar({ pathname, ...props }: AppSidebarProps) {
  const activeUrl = getActiveNavItem(pathname);
  const config = getAppConfig();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center px-2 py-3">
          <img
            src={config.logo}
            alt={config.name}
            className="h-10 w-auto"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getNavItems()} activeUrl={activeUrl} />
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
