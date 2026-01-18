import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as esbuild from 'esbuild'
import { globalExternals } from '@fal-works/esbuild-plugin-global-externals'
import prettyBytes from 'pretty-bytes'

// Load JBrowse re-exports list
// Note: Once @jbrowse/core exports this properly, can simplify to:
// import JbrowseGlobals from '@jbrowse/core/ReExports/list'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const listPath = path.join(
  __dirname,
  'node_modules/@jbrowse/core/esm/ReExports/list.js',
)
const JbrowseGlobals = await import(listPath)

function createGlobalMap(jbrowseGlobals) {
  const globalMap = {}
  for (const global of [...jbrowseGlobals, 'react-dom/client']) {
    globalMap[global] = {
      varName: `JBrowseExports["${global}"]`,
      type: 'cjs',
    }
  }
  return globalMap
}

const result = await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  globalName: 'JBrowsePluginProtein3d',
  sourcemap: true,
  outfile: 'dist/jbrowse-plugin-protein3d.umd.production.min.js',
  metafile: true,
  minify: true,
  plugins: [
    globalExternals(createGlobalMap(JbrowseGlobals.default)),
    {
      name: 'rebuild-log',
      setup({ onStart, onEnd }) {
        let time
        onStart(() => {
          time = Date.now()
        })
        onEnd(({ metafile, errors, warnings }) => {
          console.log(
            `Built in ${Date.now() - time} ms with ${
              errors.length
            } error(s) and ${warnings.length} warning(s)`,
          )
          if (!metafile) {
            return
          }
          const { outputs } = metafile
          for (const [file, metadata] of Object.entries(outputs)) {
            const size = prettyBytes(metadata.bytes)
            console.log(`Wrote ${size} to ${file}`)
          }
        })
      },
    },
  ],
})

fs.writeFileSync('meta.json', JSON.stringify(result.metafile))
