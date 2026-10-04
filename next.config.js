/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Native / Node-only packages used by API routes: keep them out of the bundle
    serverComponentsExternalPackages: ['canvas', 'pdfjs-dist', 'pdf-parse', 'tesseract.js'],
    // Tree-shake icon imports so each page only ships the icons it uses
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
}

module.exports = nextConfig
