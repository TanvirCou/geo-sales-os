import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark prisma/client as server-only so it's never bundled client-side
  serverExternalPackages: ["@prisma/client", "prisma"],

  // Strict mode for better React development
  reactStrictMode: true,

  // Image optimization domains (add map providers here in Phase 4/5)
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
