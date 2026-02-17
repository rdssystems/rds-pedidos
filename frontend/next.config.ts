import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // output: 'standalone',
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://backend:8000/api/:path*',
            },
            {
                source: '/media/:path*',
                destination: 'http://backend:8000/media/:path*',
            },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
            },
            {
                protocol: 'http',
                hostname: 'backend',
            }
        ],
    },
};

export default nextConfig;
