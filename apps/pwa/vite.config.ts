import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifestFilename: 'manifest.json',

      pwaAssets: {
        disabled: false,
        config: true,
      },

      manifest: {
        id: 'jobsmanager.effect-stack.website',
        name: 'Jobs Manager',
        short_name: 'jobs-manager',
        description: 'A local-first job manager app',
        theme_color: '#0d5257',
        background_color: '#0d5257',
        shortcuts: [],
        launch_handler: {
          client_mode: 'navigate-existing',
        },
        display: 'standalone',
        categories: ['productivity', 'business'],
        scope: '/',
        start_url: '/',
        screenshots: [
          {
            src: '/screenshot-wide.png',
            sizes: '2400x1278',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Jobs Manager Desktop View',
          },
          {
            src: '/screenshot-narrow.png',
            sizes: '2400x1278',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Jobs Manager Mobile View',
          },
        ],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 6_000_000,
      },

      devOptions: {
        enabled: false,
        navigateFallback: 'index.html',
        suppressWarnings: true,
        type: 'module',
      },
    }),
  ],
  // test: {
  //   globals: true,
  //   environment: 'jsdom',
  // },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
