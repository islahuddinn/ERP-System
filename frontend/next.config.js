/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tree-shake heavy icon/chart barrels so webpack registers every lazy chunk reliably.
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: {
    // Allow product/vendor image URLs from any host so user-entered images render
    // through next/image regardless of where they're hosted. Known hosts kept for clarity.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '13.206.232.229' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
  // Proxy same-origin /api/* calls to the local backend. Lets the app be served
  // through a single origin (e.g. an ngrok tunnel) with NEXT_PUBLIC_API_URL='/api'
  // so no CORS is involved and the public URL can change without a rebuild.
  // Dormant in prod, where the client uses the absolute domain API URL and nginx
  // routes /api → backend (this Next route is never hit).
  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN || 'http://localhost:5000'
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
    ]
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid EMFILE / corrupt lazy chunks on macOS when the file watcher exhausts descriptors.
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.git/**'],
      }
    }
    return config
  },
  // Remove experimental appDir as it's now stable in Next.js 14
  // experimental: {
  //   appDir: true,
  // },
}

module.exports = nextConfig
