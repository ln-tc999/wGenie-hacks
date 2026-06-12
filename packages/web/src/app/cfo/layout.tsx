import { CfoShell } from '@/wgenie-cfo/components/dashboard/cfo-shell';

export const metadata = {
  title: 'WalletGenie · CFO',
};

export default function CfoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CfoShell>{children}</CfoShell>;
}
