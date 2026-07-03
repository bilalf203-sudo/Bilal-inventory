import type { NextConfig } from 'next';
import type { RemotePattern } from 'next/dist/shared/lib/image-config';

function parseHost(url: string | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return { protocol: u.protocol.replace(':', '') as 'http' | 'https', hostname: u.hostname, port: u.port };
  } catch {
    return null;
  }
}

const patterns: RemotePattern[] = [];

const supabase = parseHost(process.env.NEXT_PUBLIC_SUPABASE_URL);
if (supabase) {
  patterns.push({
    protocol: supabase.protocol,
    hostname: supabase.hostname,
    pathname: '/storage/**',
  });
}

const api = parseHost(process.env.NEXT_PUBLIC_API_URL);
if (api) {
  patterns.push({
    protocol: api.protocol,
    hostname: api.hostname,
    port: api.port || undefined,
    pathname: '/uploads/**',
  });
}

// Product images come in as CDN links (the Buraq factory export uses Shopify's
// CDN). Article images render via a native <img> so they work regardless, but we
// also allowlist these hosts for any next/image usage. Extend with a comma-
// separated NEXT_PUBLIC_IMAGE_HOSTS env var for other CDNs.
const cdnHosts = [
  'cdn.shopify.com',
  ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),
];
for (const hostname of cdnHosts) {
  patterns.push({ protocol: 'https', hostname });
}

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bilal/shared'],
  images: {
    remotePatterns: patterns,
  },
};

export default config;
