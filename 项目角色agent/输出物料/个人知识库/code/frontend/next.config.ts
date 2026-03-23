import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enable PPR when available
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/ai/:path*",
        destination: `${process.env.FASTAPI_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
