// next.config.ts
import type { NextConfig } from "next";

const baseConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "stream.mux.com" },
      { protocol: "https", hostname: "image.mux.com" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "tbw27c7h9z.ufs.sh" },
      { protocol: "https", hostname: "utfs.io", pathname: "/f/**" },
    ],
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // quitamos experimental.instrumentationHook que produce warnings/crashes
  experimental: {
    // dejamos browserDebugInfoInTerminal si te resulta útil para dev
    browserDebugInfoInTerminal: true,
  },
};

// En desarrollo no envolver con Sentry para evitar interferencias con Turbopack / dev tooling.
// En producción puedes envolver con withSentryConfig como antes.
let nextConfig: NextConfig = baseConfig;

if (process.env.NODE_ENV === "production") {
  try {
    // Solo cargar sentry wrapper en producción si existe
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { withSentryConfig } = require("@sentry/nextjs");
    nextConfig = withSentryConfig(
      baseConfig,
      {
        silent: true,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
      {
        widenClientFileUpload: true,
        transpileClientSDK: true,
        tunnelRoute: "/monitoring",
        hideSourceMaps: true,
        disableLogger: true,
        automaticVercelMonitors: true,
      }
    );
  } catch (e) {
    // Si no está instalado, seguimos con baseConfig (no rompemos dev/prod)
    // console.warn("Sentry not applied:", e);
  }
}

export default nextConfig;
