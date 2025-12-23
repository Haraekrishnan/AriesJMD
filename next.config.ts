
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverRuntimeConfig: {
    // Adding this to force a restart and clear the lock file.
    forceRestart: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // REQUIRED because you use webpack customization
  turbopack: {},

  webpack: (config) => {
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
