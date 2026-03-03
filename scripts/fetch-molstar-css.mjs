import fs from 'node:fs'

const url = 'https://molstar.org/viewer/molstar.css'
console.log(`Fetching ${url}...`)
const res = await fetch(url)
if (!res.ok) {
  throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`)
}
const css = await res.text()
const outPath = 'src/ProteinView/css/molstar.ts'
fs.writeFileSync(
  outPath,
  `export default \`\n${css.replaceAll('`', '\\`').replaceAll('${', '\\${')}\`\n`,
)
console.log(`Wrote ${outPath}`)
