import {
  Home,
  Vault,
  Landmark,
  Plus,
  Users,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import type { AppId } from './vaults-registry';

export type ConfigId = AppId | 'all';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export interface AppConfig {
  id: ConfigId;
  name: string;
  title: string;
  description: string;
  logo: string;
  /** CSS classes applied to <html> element */
  themeClass: string;
  navItems: NavItem[];
  features: {
    alphaTab: boolean;
    flowCharts: boolean;
    depositorsList: boolean;
    activityPage: boolean;
  };
}

const fusionConfig: AppConfig = {
  id: 'fusion',
  name: 'Fusion by wGenie',
  title: 'Fusion by wGenie',
  description: 'ERC4626 Vault Analytics Dashboard',
  logo: '/assets/logo-fusion-by-wGenie.svg',
  themeClass: '',
  navItems: [
    { title: 'Dashboard', url: '/', icon: Home },
    { title: 'Vaults List', url: '/vaults', icon: Vault },
    { title: 'Depositors', url: '/depositors', icon: Users },
    { title: 'Activity', url: '/activity', icon: Activity },
  ],
  features: {
    alphaTab: true,
    flowCharts: true,
    depositorsList: true,
    activityPage: true,
  },
};

const yoConfig: AppConfig = {
  id: 'yo',
  name: 'YO Treasury',
  title: 'YO Treasury',
  description: 'YO Protocol Treasury Management',
  logo: '/assets/yo/yo_no_bg.svg',
  themeClass: 'yo dark',
  navItems: [
    { title: 'Home', url: '/', icon: Home },
    {
      title: 'YO Treasury',
      url: '/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D',
      icon: Landmark,
    },
    { title: 'Create YO Treasury', url: '/yo-treasury/create', icon: Plus },
  ],
  features: {
    alphaTab: false,
    flowCharts: false,
    depositorsList: false,
    activityPage: false,
  },
};

const allConfig: AppConfig = {
  id: 'all',
  name: 'Vaults Panda',
  title: 'Vaults Panda',
  description: 'ERC4626 Vault Analytics Dashboard',
  logo: '/assets/logo-fusion-by-wGenie.svg',
  themeClass: '',
  navItems: [
    { title: 'Dashboard', url: '/', icon: Home },
    { title: 'Vaults List', url: '/vaults', icon: Vault },
    { title: 'Depositors', url: '/depositors', icon: Users },
    { title: 'Activity', url: '/activity', icon: Activity },
  ],
  features: {
    alphaTab: true,
    flowCharts: true,
    depositorsList: true,
    activityPage: true,
  },
};

function atomistConfig(id: AppId, name: string, logo: string): AppConfig {
  return {
    id,
    name,
    title: name,
    description: `${name} Vaults Dashboard`,
    logo,
    themeClass: '',
    navItems: [
      { title: 'Dashboard', url: '/', icon: Home },
      { title: 'Vaults List', url: '/vaults', icon: Vault },
      { title: 'Depositors', url: '/depositors', icon: Users },
      { title: 'Activity', url: '/activity', icon: Activity },
    ],
    features: {
      alphaTab: true,
      flowCharts: true,
      depositorsList: true,
      activityPage: true,
    },
  };
}

const configs: Record<ConfigId, AppConfig> = {
  all: allConfig,
  fusion: fusionConfig,
  yo: yoConfig,
  'wgenie-dao': atomistConfig(
    'wgenie-dao',
    'wGenie DAO',
    '/assets/atomists/wgenie-dao.svg',
  ),
  clearstar: atomistConfig(
    'clearstar',
    'Clearstar',
    '/assets/atomists/clearstar.svg',
  ),
  tesseract: atomistConfig(
    'tesseract',
    'Tesseract',
    '/assets/atomists/tesseract.svg',
  ),
  xerberus: atomistConfig(
    'xerberus',
    'Xerberus',
    '/assets/atomists/xerberus.svg',
  ),
  harvest: atomistConfig(
    'harvest',
    'Harvest',
    '/assets/atomists/harvest.svg',
  ),
  reservoir: atomistConfig(
    'reservoir',
    'Reservoir',
    '/assets/atomists/reservoir.svg',
  ),
  'tau-labs': atomistConfig(
    'tau-labs',
    'TAU Labs',
    '/assets/atomists/tau-labs.png',
  ),
  tanken: atomistConfig(
    'tanken',
    'Tanken',
    '/assets/atomists/tanken.svg',
  ),
  alphaping: atomistConfig(
    'alphaping',
    'Alphaping',
    '/assets/atomists/alphaping.svg',
  ),
  'k3-capital': atomistConfig(
    'k3-capital',
    'K3 Capital',
    '/assets/atomists/k3.png',
  ),
  'mev-capital': atomistConfig(
    'mev-capital',
    'MEV Capital',
    '/assets/atomists/mev-capital.png',
  ),
  'stake-dao': atomistConfig(
    'stake-dao',
    'Stake DAO',
    '/assets/atomists/wgenie-dao.svg',
  ),
  'llama-risk': atomistConfig(
    'llama-risk',
    'Llama Risk',
    '/assets/atomists/llamarisk.svg',
  ),
  'tid-capital': atomistConfig(
    'tid-capital',
    'TiD Capital',
    '/assets/atomists/tid-capital.png',
  ),
  sentinel: atomistConfig(
    'sentinel',
    'Sentinel',
    '/assets/atomists/sentinel.png',
  ),
  hyperithm: atomistConfig(
    'hyperithm',
    'Hyperithm',
    '/assets/atomists/hyperithm.png',
  ),
};

let cachedConfig: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;
  const id = (process.env.NEXT_PUBLIC_APP_CONFIG || 'all') as ConfigId;
  cachedConfig = configs[id] ?? allConfig;
  return cachedConfig;
}

const APP_THEME_CLASS: Partial<Record<AppId, string>> = {
  fusion: 'fusion',
  yo: 'yo dark',
};

export function getThemeClassForVaultApps(apps: AppId[]): string {
  for (const app of apps) {
    const theme = APP_THEME_CLASS[app];
    if (theme) return theme;
  }
  return '';
}
