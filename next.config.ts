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
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/:path*",
          destination: "http://127.0.0.1:8000/api/:path*",
        },
      ];
    }
    if (API_BRIDGE_URL) {
      return [
        {
          source: "/api/:path*",
          destination: `${API_BRIDGE_URL}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
