import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://img.youtube.com https://i.ytimg.com https://c.saavncdn.com https://aac.saavncdn.com https://www.jiosaavn.com data:",
      "media-src 'self' https://*.saavncdn.com",
      "connect-src 'self'",
      "font-src 'self'",
      // vercel.com hosts the SSO wrapper that rewrites manifest loads on
      // auth-protected preview deployments; production stays same-origin.
      "manifest-src 'self' https://vercel.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

// Dev-only origins allowed to load the dev server cross-origin. Defaults to a
// commonly-used LAN address; override with a comma-separated list.
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "192.168.0.102")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["ioredis"],
  // Both the party store and the radio store load ioredis through a dynamic
  // require(), which file tracing cannot see. Pin it into every function that
  // touches Redis so REDIS_URL works on serverless platforms (Vercel included).
  outputFileTracingIncludes: {
    "/api/party": ["./node_modules/ioredis/**"],
    "/api/party/[roomId]": ["./node_modules/ioredis/**"],
    "/api/party/[roomId]/stream": ["./node_modules/ioredis/**"],
    "/api/radio": ["./node_modules/ioredis/**"],
    "/api/radio/skip": ["./node_modules/ioredis/**"],
    "/api/radio/complete": ["./node_modules/ioredis/**"],
    "/api/radio/report": ["./node_modules/ioredis/**"],
    "/api/radio/duration": ["./node_modules/ioredis/**"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "c.saavncdn.com",
      },
      {
        protocol: "https",
        hostname: "aac.saavncdn.com",
      },
      {
        protocol: "https",
        hostname: "www.jiosaavn.com",
      },
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
