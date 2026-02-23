import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup-env.ts'],
    // Excluir la transformación del módulo problemático
    transform: {
      '^.+\\\.tsx?$': 'ts-jest',
    },
    deps: {
      inline: [],
      external: ['@pasosdejesus/m'],
    },
  },
})
