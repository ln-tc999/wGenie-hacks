import type { Metadata } from 'next';
import '../styles/global.css';
import { getAppConfig } from '@/lib/app-config';

export function generateMetadata(): Metadata {
  const config = getAppConfig();
  return {
    title: config.title,
    description: config.description,
    icons: {
      icon: config.logo,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = getAppConfig();

  return (
    <html lang="en" className={config.themeClass || undefined}>
      <body>{children}</body>
    </html>
  );
}
