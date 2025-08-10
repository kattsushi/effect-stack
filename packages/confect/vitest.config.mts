import tsconfigPaths from 'vite-tsconfig-paths'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globalSetup: ['./test/setup.ts'],
    setupFiles: ['./test/blob-polyfill.ts', './test/react-setup.ts'],
    // Temporarily exclude problematic tests to focus on React coverage
    exclude: [
      ...(configDefaults.exclude ?? [])
    ],
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      exclude: [
        ...(configDefaults.coverage?.exclude ?? []),
        'example/**/*',
        'test/react/**/*',
        'src/**/index.ts',
        'tsdown.config.ts',
        'bin/**/*',
        'scripts/**/*'
      ],
    },
    typecheck: {
      include: ['**/*.{test,spec}{-d,}.?(c|m)[jt]s?(x)'],
    },
  },
})
