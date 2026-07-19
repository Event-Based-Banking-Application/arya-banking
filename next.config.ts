import type { NextConfig } from "next";

const repo = "arya-banking";

const nextConfig: NextConfig = {
  output: "export",
  basePath: `/${repo}`,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
