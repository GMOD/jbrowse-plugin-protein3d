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

// For the UMD build, replace loadMolstar with a version that loads the
// molstar chunk via URL relative to the plugin script. The source
// loadMolstar.ts uses a standard import('./molstarExports') which works
// natively for npm/bundler consumers.
// Assigned from the molstar build's metafile below, before the main build runs.
// The name carries a content hash so a redeployed plugin can never pair with a
// browser-cached copy of the previous chunk: JBrowse's cache buster only
// decorates the plugin url, and the query is dropped when deriving this one.
let molstarChunkName = 'molstar-chunk.js'

const umdLoadMolstarPlugin = {
  name: 'umd-load-molstar',
  setup(build) {
    build.onLoad({ filter: /loadMolstar\.ts$/ }, () => ({
      contents: `
        var src = typeof document !== 'undefined'
          ? document.currentScript?.src
          : undefined;
        var base = src ? src.replace(/\\/[^/]*$/, '/') : '';
        var cached;
        export default function loadMolstar() {
          if (!cached) {
            cached = import(base + ${JSON.stringify(molstarChunkName)}).catch(function(e) {
              cached = undefined;
              throw e;
            });
          }
          return cached;
        }
      `,
      loader: 'js',
    }))
  },
}

const globals = JBrowseReExports
const externalsPlugin = globalExternals(createGlobalMap(globals))

const molstarConfig = {
  entryPoints: [
    { in: 'src/ProteinView/molstarExports.ts', out: 'molstar-chunk' },
  ],
  bundle: true,
  outdir: 'dist',
  // esbuild appends the content hash and keeps the sourcemap link consistent
  entryNames: '[name]-[hash]',
  format: 'esm',
  metafile: true,
  sourcemap: true,
  minify: true,
  plugins: [externalsPlugin, rebuildLogPlugin],
}

const mainConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  globalName: 'JBrowsePluginProtein3d',
  metafile: true,
  plugins: [externalsPlugin, umdLoadMolstarPlugin, rebuildLogPlugin],
  ...(isWatch
    ? { outfile: 'dist/out.js' }
    : {
        outfile: 'dist/jbrowse-plugin-protein3d.umd.production.min.js',
        sourcemap: true,
        minify: true,
      }),
}

console.log('Building molstar chunk...')
const molstarResult = await esbuild.build(molstarConfig)

// umdLoadMolstarPlugin reads this when the main build loads loadMolstar.ts,
// which happens after this point
molstarChunkName = Object.keys(molstarResult.metafile.outputs)
  .map(f => f.replace(/^dist\//, ''))
  .find(f => f.endsWith('.js'))
if (!molstarChunkName) {
  throw new Error('molstar chunk build produced no .js output')
}

if (isWatch) {
  const ctx = await esbuild.context(mainConfig)
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
  const result = await esbuild.build(mainConfig)
  fs.writeFileSync('meta.json', JSON.stringify(result.metafile))
}
