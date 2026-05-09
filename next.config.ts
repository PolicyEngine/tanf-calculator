import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // react-simple-maps and recharts ship CJS interop and rely on browser
  // globals; transpiling them avoids ESM/CJS mismatch errors in the build.
  transpilePackages: ['react-simple-maps', 'recharts'],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
