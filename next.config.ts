import type { NextConfig } from "next";

// The FastAPI bridge (api/index.py) runs as a torch service, not on Vercel.
//   • development  → the bridge runs locally on :8000 (npm run dev:api)
//   • production   → /api/* is proxied to the Cloud Run bridge below.
// The URL is hardcoded on purpose (it's public, not a secret) — reading it from
// an env var previously broke when the var existed but was empty. Do NOT set an
// API_BRIDGE_URL env var in Vercel; delete it if one exists.
const nextConfig: NextConfig = {
  rewrites: async () => {
    const destination =
      process.env.NODE_ENV === "development"
        ? "http://127.0.0.1:8000/api/:path*"
        : "https://emberflow-bridge-920070228598.us-central1.run.app/api/:path*";
    // beforeFiles: proxy /api/* BEFORE any route/404 matching.
    return {
      beforeFiles: [{ source: "/api/:path*", destination }],
    };
  },
};

export default nextConfig;
