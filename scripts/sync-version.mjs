// Runs from the `version` npm lifecycle (after npm has written the new version
// to package.json, before the version commit). Keeps two generated artifacts in
// sync with the released version:
//   - src/version.ts
//   - distconfig.json's Protein3d plugin url, which points at the jbrowse.org
//     plugin-store rehosting (NOT unpkg) and is version-pinned, so it must be
//     re-stamped each bump.
import fs from 'fs'

const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'))

fs.writeFileSync('src/version.ts', `export const version = '${version}'\n`)

// In-place string replace so distconfig.json's hand/prettier formatting is
// preserved (a JSON round-trip would expand compact inline arrays).
const url = `https://jbrowse.org/plugins/jbrowse-plugin-protein3d/${version}/dist/jbrowse-plugin-protein3d.umd.production.min.js`
const cfg = fs.readFileSync('distconfig.json', 'utf8')
const next = cfg.replace(
  /"url": "https:\/\/[^"]*jbrowse-plugin-protein3d\.umd\.production\.min\.js"/,
  `"url": "${url}"`,
)
if (next === cfg && !cfg.includes(url)) {
  throw new Error(
    'sync-version: Protein3d plugin url not found in distconfig.json',
  )
}
fs.writeFileSync('distconfig.json', next)
