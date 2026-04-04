import type { NextConfig } from "next";
// @ts-ignore - next-pwa types are declared in types/next-pwa.d.ts
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
})(nextConfig);
