import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Build output mode: use standalone server bundle for portable deployments
  output: 'standalone',
  experimental: {
    // Increase body size limit for API routes
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
