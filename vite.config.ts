import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PapaToDo',
        short_name: 'PapaToDo',
        description: 'Zentrales Werkzeug zur Vorstands- und Vereinsorganisation',
        theme_color: '#ffffff',
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
