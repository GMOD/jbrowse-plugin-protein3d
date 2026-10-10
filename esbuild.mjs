import fs from 'node:fs'
import http from 'node:http'
import * as esbuild from 'esbuild'
import { globalExternals } from '@fal-works/esbuild-plugin-global-externals'
import JBrowseReExports from '@jbrowse/core/ReExports/list'
import prettyBytes from 'pretty-bytes'

const isWatch = process.argv.includes('--watch')
const PORT = process.env.PORT ? +process.env.PORT : 9000

function createGlobalMap(jbrowseGlobals) {
  const globalMap = {}
  for (const global of jbrowseGlobals) {
    globalMap[global] = {
      varName: `JBrowseExports["${global}"]`,
      type: 'cjs',
    }
  }
  globalMap['@jbrowse/mobx-state-tree'] = {
    varName: `JBrowseExports["mobx-state-tree"]`,
    type: 'cjs',
  }
  return globalMap
}

const rebuildLogPlugin = {
  name: 'rebuild-log',
  setup({ onStart, onEnd }) {
    let time
    onStart(() => {
      time = Date.now()
    })
    onEnd(({ metafile, errors, warnings }) => {
      console.log(
        `Built in ${Date.now() - time} ms with ${errors.length} error(s) and ${warnings.length} warning(s)`,
      )
      if (metafile) {
        for (const [file, metadata] of Object.entries(metafile.outputs)) {
          console.log(`Wrote ${prettyBytes(metadata.bytes)} to ${file}`)
        }
      }
    })
  },
}

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

const config = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  // Mol* is a plain import() in loadMolstar.ts, which splitting emits as a
  // sibling chunk resolved against the entry's own url, on the main thread and
  // in the RPC worker alike
  format: 'esm',
  splitting: true,
  outdir: 'dist',
  chunkNames: 'chunks/[name]-[hash]',
  metafile: true,
  plugins: [
    globalExternals(createGlobalMap(JBrowseReExports)),
    rebuildLogPlugin,
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

if (isWatch) {
  const ctx = await esbuild.context(config)
  const internalPort = PORT + 400
  const { hosts } = await ctx.serve({ servedir: '.', port: internalPort })

  http
    .createServer((req, res) => {
      const proxyReq = http.request(
        {
          hostname: hosts[0],
          port: internalPort,
          path: req.url,
          method: req.method,
          headers: req.headers,
        },
        proxyRes => {
          res.writeHead(proxyRes.statusCode, {
            ...proxyRes.headers,
            'Access-Control-Allow-Origin': '*',
          })
          proxyRes.pipe(res, { end: true })
        },
      )
      req.pipe(proxyReq, { end: true })
    })
    .listen(PORT)

  console.log(`Serving at http://${hosts[0]}:${PORT}`)
  await ctx.watch()
  console.log('Watching files...')
} else {
  const result = await esbuild.build(config)
  fs.writeFileSync('meta.json', JSON.stringify(result.metafile))
}
