import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/live/:path*",
        destination: "http://155.117.46.151:9200/:path*",
      },
    ];
  },
};

export default nextConfig;

