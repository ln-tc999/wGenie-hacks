import { cn } from '@/lib/utils';

const PROTOCOL_ICONS: Record<string, { icon: string; label: string; bgColor: string }> = {
  // kebab-case keys (from action tools)
  'aave-v3': { icon: '/protocols/aave.svg', label: 'Aave V3', bgColor: '#2B2D3E' },
  morpho: { icon: '/protocols/morpho-blue.svg', label: 'Morpho', bgColor: '#2559FF' },
  'euler-v2': { icon: '/protocols/euler.svg', label: 'Euler V2', bgColor: '#1E1E2E' },
  'yo-erc4626': { icon: '/protocols/yo.svg', label: 'YO Vault', bgColor: '#000000' },
  // display-name keys (from getMarketBalancesTool / readVaultBalances)
  'Aave V3': { icon: '/protocols/aave.svg', label: 'Aave V3', bgColor: '#2B2D3E' },
  'Aave V3 Lido': { icon: '/protocols/aave.svg', label: 'Aave V3 Lido', bgColor: '#2B2D3E' },
  'Morpho': { icon: '/protocols/morpho-blue.svg', label: 'Morpho', bgColor: '#2559FF' },
  'Euler V2': { icon: '/protocols/euler.svg', label: 'Euler V2', bgColor: '#1E1E2E' },
  'ERC4626': { icon: '/protocols/yo.svg', label: 'YO Vault', bgColor: '#000000' },
};

interface Props {
  protocol: string;
  className?: string;
}

export function ProtocolIcon({ protocol, className }: Props) {
  const config = PROTOCOL_ICONS[protocol];
  if (!config) {
    return (
      <div
        className={cn(
          'w-5 h-5 rounded bg-muted text-xs text-muted-foreground flex items-center justify-center',
          className,
        )}
      >
        {protocol.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <div
      className={cn('rounded flex items-center justify-center p-0.5', className)}
      style={{ backgroundColor: config.bgColor }}
      title={config.label}
    >
      <img
        src={config.icon}
        alt={config.label}
        className="w-full h-full object-contain"
      />
    </div>
  );
}

export function getProtocolLabel(protocol: string): string {
  return PROTOCOL_ICONS[protocol]?.label ?? protocol;
}
