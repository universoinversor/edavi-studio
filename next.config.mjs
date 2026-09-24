/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // Permite compilar en otra carpeta mientras `npm run dev` está abierto.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
