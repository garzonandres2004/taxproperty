import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export config for Cloudflare Pages
  // Read-only demo mode with JSON data
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
