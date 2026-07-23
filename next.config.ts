import type { NextConfig } from "next";

// In development the FastAPI bridge runs separately on :8000 (npm run dev:api).
// In production on Vercel, /api/* is served by the Python function at api/index.py,
// so no rewrite is needed there.
const nextConfig: NextConfig = {
  rewrites: async () =>
    process.env.NODE_ENV === "development"
      ? [
          {
            source: "/api/:path*",
            destination: "http://127.0.0.1:8000/api/:path*",
          },
        ]
      : [],
};

export default nextConfig;
