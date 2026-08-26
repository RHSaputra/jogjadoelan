import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.169.110.119",
    "localhost",
    "127.0.0.1",
    "*.trycloudflare.com",
    "trycloudflare.com"
  ],

  // ─── Image Optimization ───────────────────────────────────────
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // Format modern untuk kompresi otomatis (AVIF > WebP > original)
    formats: ["image/avif", "image/webp"],
    // Device sizes untuk responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache optimized images 30 hari
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Disable blur placeholder untuk performa (lazy load sudah cukup)
    dangerouslyAllowSVG: false,
  },

  // ─── Performance ─────────────────────────────────────────────
  compress: true,

  // ─── Compiler Optimizations ───────────────────────────────────
  compiler: {
    // Hapus semua console.* di production
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error"] }
      : false,
  },

  // ─── Experimental ─────────────────────────────────────────────
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Optimize package imports untuk mengurangi bundle size
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "radix-ui",
      "@tanstack/react-query",
    ],
  },

  // ─── HTTP Headers ─────────────────────────────────────────────
  async headers() {
    return [
      {
        // Cache static assets sangat lama (immutable = content hash di nama file)
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache image optimizer results
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // Security headers untuk semua pages
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;