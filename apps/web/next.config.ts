import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@indra/types", "@indra/design-tokens"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
