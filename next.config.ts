import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ✅ DO NOT enable turbopack when using webpack
  experimental: {},

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  webpack: (config) => {
    // Fix canvas / pdf / chart libs
    config.resolve.alias.canvas = false;
    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
