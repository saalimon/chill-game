import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// Served from https://<user>.github.io/chill-game/
export default defineConfig({
  base: '/chill-game/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        // Firebase is most of the weight and changes far less often than the
        // game does, so give it its own long-lived chunk.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Chilled Games',
        short_name: 'Chilled',
        description: 'A small collection of calm puzzle games.',
        theme_color: '#929c6f',
        background_color: '#929c6f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/chill-game/',
        scope: '/chill-game/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Firebase endpoints must never be served from cache.
        navigateFallbackDenylist: [/^\/__/],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    /*
     * Generous on purpose. Some tests wait out the real double-tap window and
     * others generate puzzles, which takes a few seconds here and several times
     * that on a shared CI runner — the 5s default turned a slow machine into a
     * failing build.
     */
    testTimeout: 30_000,
  },
})
