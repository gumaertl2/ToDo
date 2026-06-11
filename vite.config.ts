// [2026-06-04] - BUGFIX: 'skipWaiting' und 'clientsClaim' in Workbox ergänzt, um das Service Worker Update-Problem (Zombie-Phänomen) auf iOS/Desktop endgültig zu lösen.
// 2026-04-18 16:55 - CHIRURGISCHER EINGRIFF: Modern JSX Transform erzwungen, um Render-Warnungen/Freezes zu beheben
// 2026-05-15 14:20 - CHIRURGISCHER EINGRIFF: PWA Offline-Fähigkeit durch Workbox GlobPatterns und NavigateFallback erzwungen
// 2026-05-15 14:30 - BUGFIX: Workbox Dateigrößen-Limit (maximumFileSizeToCacheInBytes) auf 4MB angehoben, um das große Logo zu erlauben.
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react({ jsxRuntime: 'automatic' }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4194304,
        skipWaiting: true,
        clientsClaim: true
      },
      manifest: {
        name: 'PapaToDo',
        short_name: 'PapaToDo',
        description: 'Zentrales Werkzeug zur Vorstands- und Vereinsorganisation',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/papatodo-logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/papatodo-logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
// --- END OF FILE ---