#!/usr/bin/env node
/* global process, console */
/* eslint-disable no-console */
// Every bare import the build did NOT bundle resolves through the host's
// `JBrowseExports` map at runtime, and a key the host does not have is
// `undefined` -- which throws while the bundle evaluates, or, for a component,
// React error #130 the first time that code path renders.
//
// esbuild.mjs externalizes only paths EVERY supported host re-exports
// (scripts/host-reexports.json). This checks the built artifacts rather than
// the intent: what actually binds to the host is what the output says. The
// molstar chunk goes through the same externals, so it is scanned too.
//
// Every host, not just the oldest, because the list moves both ways. A path
// 4.0.0 re-exports and 5.0.0-beta.8 dropped is undefined on main just as surely
// as a new path is undefined on 4.0.0, and only the boot on main would have
// caught it -- and only if that module evaluates eagerly.
import fs from 'node:fs'
import path from 'node:path'

import hostReExports from './host-reexports.json' with { type: 'json' }

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

const hostVersions = Object.keys(hostReExports.hosts)
const missing = []
for (const name of bound) {
  const absentFrom = hostVersions.filter(
    v => !hostReExports.hosts[v].includes(name),
  )
  if (absentFrom.length > 0) {
    missing.push(`  ${name} -- not re-exported by ${absentFrom.join(', ')}`)
  }
}
if (missing.length > 0) {
  console.error(`dist/ binds ${missing.length} path(s) a supported host lacks:`)
  for (const line of missing) {
    console.error(line)
  }
  console.error('Those are undefined on that host. Bundle them instead.')
  process.exit(1)
}
if (bound.has('@mui/material/SvgIcon')) {
  console.error(
    'dist/ binds @mui/material/SvgIcon to the host, whose shape differs between MUI 7 and 9 hosts. Bundle it (SHAPE_VARIES_BY_HOST in esbuild.mjs).',
  )
  process.exit(1)
}

console.log(
  `${bound.size} host-bound import(s) across ${files.length} file(s), all re-exported by @jbrowse/core@${hostVersions.join(', ')}`,
)
