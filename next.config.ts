import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/shooter-model',
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
