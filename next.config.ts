import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [],
  productionBrowserSourceMaps: false,
  experimental: {
    serverMinification: true,
    optimizePackageImports: ['lucide-react'],
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;