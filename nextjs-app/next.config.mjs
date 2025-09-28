/** @type {import('next').NextConfig} */
const nextConfig = {
     reactStrictMode: true,
     // Allow cross-origin requests from specific IP addresses for development
     allowedDevOrigins: [
          '192.168.1.173'
     ]
};

export default nextConfig;
