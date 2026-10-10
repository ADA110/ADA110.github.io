import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Plain static files for GitHub Pages (ada110.github.io). /about -> /about/index.html
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
