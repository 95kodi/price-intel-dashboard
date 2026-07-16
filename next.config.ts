import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/live/:path*",
        destination: "https://api.gogizmo.co/:path*",
      },
    ];
  },
};

export default nextConfig;
