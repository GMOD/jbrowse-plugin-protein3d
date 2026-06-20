// Runs from the `version` npm lifecycle (after npm has written the new version
// to package.json, before the version commit). Writes src/version.ts from the
// package version. distconfig.json's plugin url no longer needs stamping — it
// points at the version-agnostic jbrowse.org "latest" rehosting path.
import fs from 'fs'

const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'))
fs.writeFileSync('src/version.ts', `export const version = '${version}'\n`)
