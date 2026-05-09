import { defineConfig } from 'vitest/config'

import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup-env.ts'],
    coverage: {
      enabled: true,
      all: true,
      include: ['lib/**', 'app/api/**'],
      reporter: ['text', 'json', 'html'],
      provider: 'v8',
    },
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
