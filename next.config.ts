import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark prisma/client as server-only so it's never bundled client-side
  serverExternalPackages: ["@prisma/client", "prisma"],

  // Compression and security headers
  compress: true,
  poweredByHeader: false,

  // Strict mode for better React development
  reactStrictMode: true,

  // Allow dev origins for ngrok tunnels
  allowedDevOrigins: [
    "stash-various-moisten.ngrok-free.dev",
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
    "localhost:3000",
  ],

  // Allow ngrok and local origins for Server Actions
  experimental: {
    serverActions: {
      allowedOrigins: [
        "*.ngrok-free.dev",
        "*.ngrok-free.app",
        "*.ngrok.app",
        "*.ngrok.io",
        "localhost:3000",
      ],
    },
  },

  // Image optimization domains (add map providers here in Phase 4/5)
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
