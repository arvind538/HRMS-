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



// /** @type {import('next').NextConfig} */

// const raw = (process.env.BACKEND_URL || "").trim();

// // No fallback. Local: client/.env.local. Production: hosting dashboard (Vercel).
// if (!raw) {
//   throw new Error(
//     "BACKEND_URL is not set. Local: add BACKEND_URL=http://localhost:5000 in client/.env.local. " +
//     "Production: add it in the Vercel Environment Variables."
//   );
// }

// // No "/api" and no trailing slash. If written by mistake, it is removed.
// const BACKEND = raw.replace(/\/+$/, "").replace(/\/api$/, "");

// if (!/^https?:\/\//.test(BACKEND)) {
//   throw new Error(`BACKEND_URL must start with http:// or https://. Current value: "${BACKEND}"`);
// }

// const nextConfig = {
//   // wait longer for the backend (Render free plan needs time to wake up)
//   experimental: { proxyTimeout: 120000 },

//   async rewrites() {
//     return [
//       { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
//       { source: "/uploads/:path*", destination: `${BACKEND}/uploads/:path*` },
//     ];
//   },
// };

// export default nextConfig;






// /** @type {import('next').NextConfig} */

// const raw = process.env.BACKEND_URL;

// // In production a missing BACKEND_URL stops the build, so a wrong deploy never goes live silently
// if (!raw && process.env.NODE_ENV === "production") {
//   throw new Error("BACKEND_URL is not set. Add it in the hosting dashboard, for example https://your-api.onrender.com");
// }

// // No "/api" and no trailing slash. If it is written by mistake, it is removed.
// const BACKEND = (raw || "http://localhost:5000").trim().replace(/\/+$/, "").replace(/\/api$/, "");

// if (!/^https?:\/\//.test(BACKEND)) {
//   throw new Error(`BACKEND_URL must start with http:// or https://. Current value: "${BACKEND}"`);
// }

// const nextConfig = {
//   // wait longer for the backend (Render free plan needs time to wake up)
//   experimental: { proxyTimeout: 120000 },

//   async rewrites() {
//     return [
//       { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
//       { source: "/uploads/:path*", destination: `${BACKEND}/uploads/:path*` },
//     ];
//   },
// };

// export default nextConfig;











// /** @type {import('next').NextConfig} */

// // BACKEND_URL bina "/api" aur bina trailing slash ke hona chahiye.
// // Agar galti se "/api" likha ho to wo bhi hata diya jata hai.
// const BACKEND = (process.env.BACKEND_URL || "http://localhost:5000")
//   .replace(/\/+$/, "")
//   .replace(/\/api$/, "");

// const nextConfig = {
//   async rewrites() {
//     return [
//       {
//         source: "/api/:path*",
//         destination: `${BACKEND}/api/:path*`,
//       },
//       {
//         source: "/uploads/:path*",
//         destination: `${BACKEND}/uploads/:path*`,
//       },
//     ];
//   },
// };

// export default nextConfig;





// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   /* config options here */
//   reactCompiler: true,


// };

// export default nextConfig;
