/** @type {import('next').NextConfig} */
const nextConfig = {
  // images: { remotePatterns: [{ hostname: "*" }] },
  // output: "standalone",
  env: {
    PORT: process.env.PORT || process.argv.find(arg => arg.startsWith('-p=') || arg.startsWith('--port='))?.split('=')[1] || '3001',
  },
};

export default nextConfig;
