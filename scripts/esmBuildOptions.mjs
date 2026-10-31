/**
 * The ES module JBrowse 5 loads for this plugin. Everything the host
 * re-exports to plugins is bound by core's `hostShim` to the host's copy on
 * `JBrowseExports`, so the bundle reuses the host's React, MobX and
 * `@jbrowse/core` rather than carrying a second copy, and an import the host
 * does not serve by that name fails the build. `pluginName` is the plugin's
 * name in a config (`Protein3d`), which the shim's runtime error names.
 */
import { hostShim } from '@jbrowse/core/ReExports/hostShim'

// Mol*'s `produce` hands mutative recipes that return a fresh object, which
// mutative's development build warns about on every call (since Mol* 5.13).
// The shipped build is minified, so esbuild defines NODE_ENV as production and
// mutative is silent; the watch build takes the same mutative so the harness
// console says what a host's would.
const shippedMutativePlugin = {
  name: 'shipped-mutative',
  setup(build) {
    build.onResolve({ filter: /^mutative\/dist\/index\.js$/ }, args =>
      build.resolve('mutative/dist/mutative.cjs.production.min.js', {
        kind: args.kind,
        resolveDir: args.resolveDir,
      }),
    )
  },
}

export function esmBuildOptions({ isWatch = false, shim = {} } = {}) {
  return {
    entryPoints: ['src/index.ts'],
    bundle: true,
    // Mol* is a plain import() in loadMolstar.ts, which splitting emits as a
    // sibling chunk resolved against the entry's own url, on the main thread
    // and in the RPC worker alike
    format: 'esm',
    splitting: true,
    outdir: 'dist',
    chunkNames: 'chunks/[name]-[hash]',
    metafile: true,
    plugins: [
      hostShim({ pluginName: 'Protein3d', ...shim }),
      ...(isWatch ? [shippedMutativePlugin] : []),
    ],
    ...(isWatch
      ? { entryNames: 'out' }
      : {
          entryNames: 'jbrowse-plugin-protein3d.esm',
          sourcemap: true,
          minify: true,
        }),
  }
}
