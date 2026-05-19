/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['recharts', 'd3'],
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), { 'node-pty': 'commonjs node-pty' }]
    return config
  },
}

module.exports = nextConfig
