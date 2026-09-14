#!/usr/bin/env node
/* global process, console */
/* eslint-disable no-console */
// Every bare import the build did NOT bundle resolves through the host's
// `JBrowseExports` map at runtime, and a key the host does not have is
// `undefined` -- which throws while the bundle evaluates, or, for a component,
// React error #130 the first time that code path renders.
//
// esbuild.mjs externalizes only the intersection of this build's @jbrowse/core
// ReExports list with the oldest supported host's
// (scripts/host-reexports-floor.json). This checks the built artifacts rather
// than the intent: what actually binds to the host is what the output says. The
// molstar chunk goes through the same externals, so it is scanned too.
import fs from 'node:fs'
import path from 'node:path'

import floor from './host-reexports-floor.json' with { type: 'json' }

const files = fs
  .readdirSync('dist')
  .filter(f => f.endsWith('.js'))
  .map(f => path.join('dist', f))
if (!files.some(f => f.endsWith('.umd.production.min.js'))) {
  console.error('No UMD bundle in dist/ -- run pnpm build first')
  process.exit(1)
}

// a key that is a valid identifier (`react`, `mobx`) minifies to dot access,
// the rest stay bracketed
const bound = new Set()
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  for (const m of [
    ...source.matchAll(/JBrowseExports\[\s*"([^"]+)"\s*\]/g),
    ...source.matchAll(/JBrowseExports\.([A-Za-z_$][\w$]*)/g),
  ]) {
    bound.add(m[1])
  }
}
// esbuild.mjs maps this one onto the host's older key on purpose
bound.delete('mobx-state-tree')

const floorPaths = new Set(floor.paths)
const newer = [...bound].filter(x => !floorPaths.has(x))
if (newer.length > 0) {
  console.error(
    `dist/ binds ${newer.length} path(s) that @jbrowse/core@${floor.version} does not re-export:`,
  )
  for (const name of newer) {
    console.error(`  ${name}`)
  }
  console.error(
    'Those are undefined on the oldest supported host. Bundle them instead.',
  )
  process.exit(1)
}
if (bound.has('@mui/material/SvgIcon')) {
  console.error(
    'dist/ binds @mui/material/SvgIcon to the host, whose shape differs between MUI 7 and 9 hosts. Bundle it (SHAPE_VARIES_BY_HOST in esbuild.mjs).',
  )
  process.exit(1)
}

console.log(
  `${bound.size} host-bound import(s) across ${files.length} file(s), all re-exported by @jbrowse/core@${floor.version}`,
)
