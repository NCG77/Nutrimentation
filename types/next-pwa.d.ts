declare module 'next-pwa' {
  import type { NextConfig } from 'next';

  interface PWAConfig {
    dest?: string;
    public?: string;
    register?: boolean;
    scope?: string;
    sw?: string;
    runtimeCaching?: any[];
    skipWaiting?: boolean;
    [key: string]: any;
  }

  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;

  export default withPWA;
}

declare module 'next-pwa' {
  export { };
}
