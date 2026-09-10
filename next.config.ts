import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Supabase Storage is accessed via signed URLs only, but allowing the
  // storage host for streaming is a safety net during local development.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // Keep bundles lean on the client portal
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
