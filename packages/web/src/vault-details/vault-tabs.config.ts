import z from 'zod';
import { getAppConfig, type AppConfig } from '@/lib/app-config';

interface TabConfig {
  label: string;
  description: string;
  id: string;
  featureFlag?: keyof AppConfig['features'];
}

export const TABS = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Key metrics and flow analysis',
  },
  {
    id: 'depositors',
    label: 'Depositors',
    description: 'Depositor information and statistics',
  },
  {
    id: 'activity',
    label: 'Activity',
    description: 'Recent transactions and activity',
  },
  {
    id: 'alpha',
    label: 'Alpha',
    description: 'Chat with AI about this vault',
    featureFlag: 'alphaTab' as const,
  },
] as const satisfies TabConfig[];

export type TabId = (typeof TABS)[number]['id'];

export function getVisibleTabs() {
  const config = getAppConfig();
  return TABS.filter((tab) => {
    if (!('featureFlag' in tab) || !tab.featureFlag) return true;
    return config.features[tab.featureFlag];
  });
}

export const getTabConfig = (id: TabId) => {
  return TABS.find((tab) => tab.id === id);
};

export const tabSchema = z.enum(TABS.map((tab) => tab.id));

export function isValidTab(tab: string): tab is TabId {
  return tabSchema.safeParse(tab).success;
}
