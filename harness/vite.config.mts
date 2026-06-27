// Standalone harness for exercising the plugin's structure-loading + coordinate
// mapping against real PDB / AlphaFold entries. Run with:
//   node_modules/.bin/vite --config harness/vite.config.mts
// (plain object rather than defineConfig() — `vite` is a transitive dep here and
// isn't resolvable as a bare specifier from this config file)
export default {
  root: 'harness',
  esbuild: { jsx: 'automatic' as const },
  server: { port: 5180, open: false },
}
