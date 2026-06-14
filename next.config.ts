import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const isProd = process.env.NODE_ENV === "production";

// Define development origins
const devOrigins = [
  'giver-molar-judiciary.ngrok-free.dev',
  'localhost:3000',
  '192.168.1.12:3000',
];
const cspHeader = `
    default-src 'self';
    script-src 'self' ${isProd ? "" : "'unsafe-eval'"} 'unsafe-inline' https://clerk.com https://*.clerk.accounts.dev https://js.stripe.com https://cdn.tailwindcss.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://img.clerk.com https://utfs.io;
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-src https://js.stripe.com https://checkout.stripe.com;
    connect-src 'self' 
        https://clerk.com 
        https://*.clerk.accounts.dev 
        https://api.stripe.com 
        https://*.upstash.io
        https://*.sentry.io
        https://uploadthing.com
        https://*.uploadthing.com
        https://www.google-analytics.com
        https://stats.g.doubleclick.net
        ${isProd ? "" : "http://localhost:3000 https://giver-molar-judiciary.ngrok-free.dev http://192.168.1.12:3000 ws://localhost:3000 ws://192.168.1.12:3000"};
    worker-src 'self' blob:;
    upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf2json', 'mammoth', 'underscore', 'lop'],
  images: {
    formats: ['image/webp'],
  },

  // This must be here to stop the "Blocked cross-origin" error
  experimental: {
    serverActions: {
      allowedOrigins: isProd ? [] : devOrigins,
    },
  },


  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: "your-org",
  project: "cvmatch-pro",
  silent: true,
});
