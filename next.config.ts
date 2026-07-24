import type { NextConfig } from "next";

// The FastAPI bridge (api/index.py) runs as a torch service, not on Vercel.
//   • development  → the bridge runs locally on :8000 (npm run dev:api)
//   • production   → /api/* is proxied to the Render bridge below. The URL is
//                    public (not a secret), so it's hardcoded to avoid the
//                    build-time env-var pitfalls; override with API_BRIDGE_URL
//                    if you ever move the bridge.
const API_BRIDGE_URL =
  process.env.API_BRIDGE_URL ?? "https://emberflow-bridge.onrender.com";

const nextConfig: NextConfig = {
  rewrites: async () => {
    const destination =
      process.env.NODE_ENV === "development"
        ? "http://127.0.0.1:8000/api/:path*"
        : `${API_BRIDGE_URL}/api/:path*`;
    // beforeFiles: proxy /api/* BEFORE any route/404 matching (App Router can
    // otherwise 404 an afterFiles rewrite for an unmatched path).
    return {
      beforeFiles: [{ source: "/api/:path*", destination }],
    };
  },
};

export default nextConfig;
