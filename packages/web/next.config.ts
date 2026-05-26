import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@wgenie/fusion-supabase-ponder', '@wgenie/fusion-mastra'],
  outputFileTracingRoot: path.resolve(import.meta.dirname, '../../'),
};

export default nextConfig;
