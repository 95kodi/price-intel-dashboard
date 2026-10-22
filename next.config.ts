import type { NextConfig } from "next";

// Static export for Hostinger shared hosting (no Node.js there): `npm run build`
// writes plain HTML/JS to out/, which is uploaded to public_html. The data
// comes from the PHP API in public_html/api (see backend-php/README.md).
const nextConfig: NextConfig = {
  output: "export",
  // /dashboard → dashboard/index.html, which Apache serves without rewrites.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
