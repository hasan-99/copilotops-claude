/** @type {import('next').NextConfig} */
const nextConfig = {
  // API routes are server-only (OpenRouter key never reaches the client).
  // Add a Railway worker target in Phase 5 if long-running jobs are scoped.
};

export default nextConfig;
