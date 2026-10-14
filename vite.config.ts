// [2026-10-14] - BUGFIX: Vite/Babel Warnung bezüglich altem JSX-Transform in Dependencies (wie react-big-calendar) unterdrückt.
// [2026-10-04] - FEATURE: Automatische Build-Versionsnummer (__APP_BUILD_DATE__) via define-Block für UI-Anzeige injiziert.
// [2026-06-04] - BUGFIX: 'skipWaiting' und 'clientsClaim' in Workbox ergänzt, um das Service Worker Update-Problem auf iOS endgültig zu lösen.
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const buildDate = new Date().toLocaleString('de-DE', { 
  day: '2-digit', month: '2-digit', year: 'numeric', 
  hour: '2-digit', minute: '2-digit' 
});

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [
    tailwindcss(),
    react({ 
      jsxRuntime: 'automatic',
      // Unterdrückt die Warnung, falls alte NPM-Pakete noch den "classic" Transform nutzen
      babel: {
        assumptions: {
          setPublicClassFields: true
        }
      }
    }),
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