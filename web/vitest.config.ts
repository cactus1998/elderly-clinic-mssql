import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Separate from vite.config.ts so the devtools plugin is not loaded in tests.
// Keep the aliases in sync with vite.config.ts.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@api-types': fileURLToPath(new URL('../api/types', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/__tests__/*.test.ts'],
    restoreMocks: true,
    unstubGlobals: true,
  },
})
