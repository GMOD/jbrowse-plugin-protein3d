// Standalone harness for exercising the plugin's structure-loading + coordinate
// mapping against real PDB / AlphaFold entries. Run with:
//   node_modules/.bin/vite --config harness/vite.config.mts
export default {
  root: 'harness',
  esbuild: { jsx: 'automatic' as const },
  server: { port: 5180, open: false },
}
