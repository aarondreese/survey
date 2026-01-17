import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Increase body size limit for API routes
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
