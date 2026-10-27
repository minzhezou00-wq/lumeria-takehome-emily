import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the API see which real scan photos exist (lib/reports.ts) when deployed.
  outputFileTracingIncludes: { "/api/reports/[id]": ["./public/scans/**"] },
};

export default nextConfig;
