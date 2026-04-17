import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // ✅ DESACTIVAR STRICT MODE
  // ✅ Configurar dominios permitidos para imágenes
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/captures/**',
      },      
    ],
  },
};

export default nextConfig;