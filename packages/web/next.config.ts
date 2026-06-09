import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@wgenie/fusion-supabase-ponder'],
  outputFileTracingRoot: path.resolve(import.meta.dirname, '../../'),
};

export default nextConfig;
