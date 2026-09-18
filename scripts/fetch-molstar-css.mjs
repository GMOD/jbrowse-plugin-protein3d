import fs from 'node:fs'
import { createRequire } from 'node:module'

// The installed package's own stylesheet, so the css always matches the Mol*
// version the chunk bundles. molstar.org serves whatever release is current.
// The sourceMappingURL line goes: no map ships with the plugin, and the
// comment sends vite, and anyone with devtools open, after one.
const require = createRequire(import.meta.url)
const inPath = require.resolve('molstar/build/viewer/molstar.css')
const css = fs
  .readFileSync(inPath, 'utf8')
  .replace(/\n?\/\*# sourceMappingURL=.*\*\/\s*$/, '\n')
const outPath = 'src/ProteinView/css/molstar.ts'
fs.writeFileSync(
  outPath,
  `export default \`\n${css.replaceAll('`', '\\`').replaceAll('${', '\\${')}\`\n`,
)
console.log(`Wrote ${outPath} from ${inPath}`)
