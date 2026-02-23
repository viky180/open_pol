import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseRemotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [];

if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    supabaseRemotePatterns.push({
      protocol: parsed.protocol.replace(':', '') as 'http' | 'https',
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: '/storage/v1/object/public/**',
    });
  } catch {
    // Ignore invalid env values; no remote pattern will be added.
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseRemotePatterns,
  },
  experimental: {
    // Disable client-side router cache to always fetch fresh data
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
};

export default nextConfig;
