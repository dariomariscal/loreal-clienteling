import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@loreal/contracts", "@loreal/utils"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
    ],
  },
};

export default nextConfig;
