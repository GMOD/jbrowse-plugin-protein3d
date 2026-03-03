import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import JBrowseReExports from '@jbrowse/core/ReExports/list'

function createGlobals(jbrowseGlobals) {
  const globals = {}
  for (const mod of jbrowseGlobals) {
    globals[mod] = `JBrowseExports["${mod}"]`
  }
  globals['@jbrowse/mobx-state-tree'] = 'JBrowseExports["mobx-state-tree"]'
  return globals
}

const globals = createGlobals(JBrowseReExports)

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/jbrowse-plugin-protein3d.umd.production.min.js',
    format: 'iife',
    name: 'JBrowsePluginProtein3d',
    globals,
    sourcemap: true,
    inlineDynamicImports: true,
  },
  external: [...JBrowseReExports, '@jbrowse/mobx-state-tree'],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: { jsx: 'react-jsx' },
    }),
    resolve(),
    commonjs(),
    json(),
    terser(),
  ],
}
