import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // @react-pdf/renderer is ESM-only; exclude from server bundle to avoid require() errors
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
