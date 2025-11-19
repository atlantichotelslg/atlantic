/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.BUILD_MODE === 'electron' ? 'export' : undefined,
  images: {
    unoptimized: process.env.BUILD_MODE === 'electron' ? true : false,
  },
  ...(process.env.BUILD_MODE === 'electron' && {
    assetPrefix: './',
    trailingSlash: true,
  })
};

module.exports = nextConfig;