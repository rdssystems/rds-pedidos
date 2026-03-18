import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  assetPrefix: '/landing-assets',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
