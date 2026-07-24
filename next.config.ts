import type { NextConfig } from "next";

// The FastAPI bridge (api/index.py) runs as a torch service, not on Vercel.
//   • development  → the bridge runs locally on :8000 (npm run dev:api)
//   • production   → the bridge runs on Render; set API_BRIDGE_URL in Vercel
//                    (e.g. https://emberflow-bridge.onrender.com) and /api/*
//                    is proxied there. Nothing in the React code changes.
const API_BRIDGE_URL = process.env.API_BRIDGE_URL;

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
