import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 120_000,
    hookTimeout: 60_000,
    globals: true,
    // A green run says so and nothing else. Much of what these tests print is
    // not ours to remove — molstar logs a token before throwing on a bad parse,
    // mobx prints any exception a reaction raises, and the error-path tests
    // exercise handlers whose job is to console.error. Held rather than
    // dropped: vitest replays a failing test's output, and `--silent=false`
    // brings back a passing one's.
    silent: 'passed-only',
    include: [
      'src/**/*.test.ts',
      'test/**/*.test.ts',
      // the harness's offline diagnostics tests were never picked up
      'harness/**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
  },
})
