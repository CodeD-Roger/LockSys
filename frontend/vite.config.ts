import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      // Assets to include in the precache manifest
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png'],

      manifest: {
        name: 'LockSys',
        short_name: 'LockSys',
        description: 'Self-hosted, zero-knowledge password manager',
        theme_color: '#0f0f14',
        background_color: '#0f0f14',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },

      workbox: {
        // Precache only static assets — never vault data
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        // SECURITY: all API routes must bypass the cache entirely.
        // Encrypted vault entries must never be stored in the service worker cache.
        runtimeCaching: [
          {
            urlPattern: /\/(auth|vaults|entries|admin|health)(\/|$|\?)/i,
            handler: 'NetworkOnly',
          },
        ],

        navigateFallback: 'index.html',
      },

      // Keep SW disabled in dev to avoid caching surprises during development
      devOptions: {
        enabled: false,
      },
    }),
  ],

  server: {
    port: 5173,
    // Proxy all API paths to the backend during development.
    // In production the frontend is served by FastAPI on the same origin,
    // so no proxy is needed and API_BASE defaults to '' (relative URLs).
    proxy: {
      '/auth':    { target: 'http://localhost:8000', changeOrigin: true },
      '/vaults':  { target: 'http://localhost:8000', changeOrigin: true },
      '/entries': { target: 'http://localhost:8000', changeOrigin: true },
      '/admin':   { target: 'http://localhost:8000', changeOrigin: true },
      '/health':  { target: 'http://localhost:8000', changeOrigin: true },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
