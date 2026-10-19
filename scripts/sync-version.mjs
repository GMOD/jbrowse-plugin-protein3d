// Runs from the `version` npm lifecycle, after npm writes the new version to
// package.json and before the version commit
import fs from 'fs'

const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'))
fs.writeFileSync('src/version.ts', `export const version = '${version}'\n`)
