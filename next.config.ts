import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the API see which real scan photos exist (lib/reports.ts) when deployed.
  outputFileTracingIncludes: { "/api/reports/[id]": ["./public/scans/**"] },
  // Hide Next's "N" dev badge so local previews look like the real app.
  devIndicators: false,
};

export default nextConfig;
