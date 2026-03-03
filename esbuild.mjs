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
            cached = import(base + 'molstar-chunk.js').catch(function(e) {
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
  entryPoints: ['src/ProteinView/molstarExports.ts'],
  bundle: true,
  outfile: 'dist/molstar-chunk.js',
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
await esbuild.build(molstarConfig)

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
