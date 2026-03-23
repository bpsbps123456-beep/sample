import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "cbrdnmirvibkzjkhhdyf.supabase.co",
      },
    ],
  },
};

export default nextConfig;
