/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['playwright-core', '@sparticuz/chromium']
  },
  images: {
    domains: ['p16-sign-sg.tiktokcdn.com', 'p16-sign.tiktokcdn.com'],
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: false
  },
  eslint: {
    ignoreDuringBuilds: false
  }
};

export default nextConfig;