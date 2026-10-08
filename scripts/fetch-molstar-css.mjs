import fs from 'node:fs'
import { createRequire } from 'node:module'

// The installed package's own stylesheet, so the css always matches the Mol*
// version the chunk bundles. molstar.org serves whatever release is current.
// The sourceMappingURL line goes: no map ships with the plugin, and the
// comment sends vite, and anyone with devtools open, after one.
//
// Only `pnpm start` writes the file, so `--check` compares instead and gates
// `pnpm lint`: a molstar bump otherwise ships the previous release's css.
const require = createRequire(import.meta.url)
const inPath = require.resolve('molstar/build/viewer/molstar.css')
const css = fs
  .readFileSync(inPath, 'utf8')
  .replace(/\n?\/\*# sourceMappingURL=.*\*\/\s*$/, '\n')
const outPath = 'src/ProteinView/css/molstar.ts'
const generated = `export default \`\n${css.replaceAll('`', '\\`').replaceAll('${', '\\${')}\`\n`

if (process.argv.includes('--check')) {
  if (fs.readFileSync(outPath, 'utf8') !== generated) {
    console.error(
      `${outPath} does not match the installed Mol* stylesheet: run \`pnpm fetch-molstar-css\` and commit the result`,
    )
    process.exit(1)
  }
} else {
  fs.writeFileSync(outPath, generated)
  console.log(`Wrote ${outPath} from ${inPath}`)
}
