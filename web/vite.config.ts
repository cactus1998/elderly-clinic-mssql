import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Shared TypeScript interfaces that mirror the C# DTOs (type-only imports, erased at build).
      '@api-types': fileURLToPath(new URL('../api/types', import.meta.url)),
    },
  },
  server: {
    // Forward /api to the ASP.NET Core API so the browser sees one origin (no CORS setup needed).
    proxy: {
      '/api': 'http://localhost:5268',
    },
  },
})
