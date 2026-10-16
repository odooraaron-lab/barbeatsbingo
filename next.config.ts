import type { NextConfig } from "next";

// Where the old WordPress site's photos can still be fetched from. Only used
// for images that haven't been copied into public/images yet.
const LEGACY_ORIGIN = (process.env.LEGACY_ASSET_ORIGIN || "https://www.barbeatsbingo.com").replace(/\/$/, "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // pdf.js reads call lists and scorecards on the server; it runs best unbundled.
  serverExternalPackages: ["pdfjs-dist"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      // Files in public/images win; anything missing falls through to the old site.
      fallback: [
        {
          source: "/images/:path*",
          destination: `${LEGACY_ORIGIN}/wp-content/uploads/:path*`,
        },
      ],
    };
  },
  async redirects() {
    return [
      // Old WordPress URLs people may have bookmarked.
      { source: "/wp-admin/:path*", destination: "/admin", permanent: false },
      { source: "/wp-login.php", destination: "/login", permanent: false },
      { source: "/home", destination: "/", permanent: true },
      { source: "/login/portal", destination: "/portal", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        source: "/(portal|admin|login|forgot-password|reset-password)(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
