import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // @react-pdf/renderer is ESM-only; exclude from server bundle to avoid require() errors
  serverExternalPackages: ['@react-pdf/renderer'],
  // Ship the SQLite database with every serverless function bundle.
  // (Replaces the invalid top-level `includeFiles` in vercel.json, which
  // failed Vercel's schema validation and blocked all deployments.)
  outputFileTracingIncludes: {
    '/**': ['./prisma/dev.db'],
  },
};

export default nextConfig;
