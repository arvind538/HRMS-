/** @type {import('next').NextConfig} */

// Fallback to localhost during CI/GitHub Actions build if BACKEND_URL is not provided
const raw = (process.env.BACKEND_URL).trim();

// No "/api" and no trailing slash. If written by mistake, it is removed.
const BACKEND = raw.replace(/\/+$/, "").replace(/\/api$/, "");

if (!/^https?:\/\//.test(BACKEND)) {
  throw new Error(`BACKEND_URL must start with http:// or https://. Current value: "${BACKEND}"`);
}

const nextConfig = {
  // wait longer for the backend (Render free plan needs time to wake up)
  experimental: { proxyTimeout: 120000 },

  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND}/uploads/:path*` },
    ];
  },
};

export default nextConfig;

