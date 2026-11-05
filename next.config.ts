import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Auth + per-request schedule data — keep classic dynamic rendering for the pilot.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
