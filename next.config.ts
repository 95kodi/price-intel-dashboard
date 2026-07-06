import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  // Output file tracing misses playwright-core's runtime assets (browsers.json)
  // and @sparticuz/chromium's brotli-packed binary, crashing the function on Vercel.
  outputFileTracingIncludes: {
    "/api/scrape-price": [
      "./node_modules/playwright-core/**/*",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
  },
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

