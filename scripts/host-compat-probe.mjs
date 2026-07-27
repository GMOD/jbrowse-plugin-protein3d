#!/usr/bin/env node
//
// Probes one published plugin bundle against many hosted JBrowse builds and
// reports, per host version, whether the session boots, the UMD global is
// defined, the view type registered, and a declarative ProteinView launch
// reaches its settled state.
//
// jbrowse.org/code/jb2/<vX.Y.Z>/ hosts every release, so the matrix needs no
// `jbrowse create` per version.
//
// Usage: node scripts/host-compat-probe.mjs [--versions v3.7.0,v4.3.0] [--json out.json]
//
import fs from 'node:fs'
import { parseArgs } from 'node:util'

import puppeteer from 'puppeteer'

const DEFAULT_VERSIONS = [
  'v2.15.0',
  'v3.0.0',
  'v3.7.0',
  'v4.0.0',
  'v4.2.0',
  'v4.3.0',
  'latest',
  'main',
]

// A config hosted on the same origin as the app builds, declaring the plugin at
// its version-agnostic store path. Absolute so every host build reads the same
// one (a relative config path resolves against the app dir, where old builds
// have no such fixture).
const CONFIG =
  'https://jbrowse.org/code/jb2/main/test_data/protein3d_config.json'

const LAUNCH_SPEC = {
  views: [
    {
      type: 'ProteinView',
      uniprotId: 'P04637',
      transcriptId: 'NM_000546.6',
      connectedView: {
        assembly: 'hg38',
        loc: 'chr17:7,671,000-7,684,500',
        tracks: ['hg38-ncbiRefSeq'],
      },
    },
  ],
}

const { values } = parseArgs({
  options: {
    versions: { type: 'string' },
    // Oldest host the published bundle is expected to work on. Given, the run
    // exits non-zero when that host or any newer one fails, so a release that
    // silently raises the floor is a build failure rather than a user's bug
    // report. Hosts below it are still probed and reported, just not gated.
    floor: { type: 'string' },
    json: { type: 'string' },
    timeout: { type: 'string', default: '90000' },
  },
})
const versions = values.versions?.split(',') ?? DEFAULT_VERSIONS
const timeout = Number(values.timeout)

function url(version, withSpec) {
  const spec = withSpec
    ? `&session=spec-${encodeURIComponent(JSON.stringify(LAUNCH_SPEC))}`
    : ''
  return `https://jbrowse.org/code/jb2/${version}/?config=${encodeURIComponent(CONFIG)}${spec}`
}

// The app's session global has been renamed across the range this probes, so
// read whichever one this host defines rather than assuming.
function readSession() {
  const w = /** @type {Record<string, any>} */ (window)
  return w.JBrowseSession ?? w.__jbrowse_session ?? w.JBrowseRootModel?.session
}

async function probeOne(browser, version) {
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', m => {
    if (m.type() === 'error') {
      consoleErrors.push(m.text().slice(0, 200))
    }
  })
  page.on('pageerror', e => {
    consoleErrors.push(`pageerror: ${String(e).slice(0, 200)}`)
  })

  const result = { version, consoleErrors }
  try {
    await page.goto(url(version, true), {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    // Readiness is the session global (jbrowse-web has set it since v1.0.1, so
    // it is available across this whole matrix) or the error page. Do NOT wait on
    // markup: the loading spinner is an svg, so an element-presence wait returns
    // before plugins have loaded and reads every host as broken.
    result.settled = await page
      .waitForFunction(
        () =>
          !!(window.JBrowseSession ?? window.__jbrowse_session) ||
          /JBrowse Error|Fatal error/.test(document.body.innerText),
        { timeout: 45_000 },
      )
      .then(() => true)
      .catch(() => false)

    result.appError = await page.evaluate(() => {
      const t = document.body.innerText
      return t.includes('JBrowse Error') || t.includes('Fatal error')
        ? t.split('\n').slice(0, 4).join(' | ').slice(0, 300)
        : undefined
    })

    result.globalDefined = await page.evaluate(
      () => 'JBrowsePluginProtein3d' in window,
    )

    // The type registry is not reachable from the page (it lives in the MST env,
    // not on a global), so registration is asserted the way a user experiences
    // it: the declarative launch below either produces a settled view or does
    // not.
    //
    // Settled state of the launched view. The plugin flips this test-id only
    // once the structure has loaded and no pairwise alignment is pending, so it
    // is a real completion signal rather than a duration guess.
    result.viewReady = await page
      .waitForSelector('[data-testid="protein-view-ready"]', { timeout })
      .then(() => true)
      .catch(() => false)

    result.sessionViews = await page.evaluate(() => {
      const w = /** @type {Record<string, any>} */ (window)
      const session = w.JBrowseSession ?? w.__jbrowse_session
      return session?.views?.map(v => v.type)
    })

    result.bodyText = await page.evaluate(() =>
      document.body.innerText.replace(/\s+/g, ' ').slice(0, 200),
    )
  } catch (e) {
    result.threw = String(e).slice(0, 200)
  }
  await page.close()
  return result
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--use-gl=swiftshader'],
  defaultViewport: { width: 1400, height: 900 },
})

const floorIndex = values.floor ? versions.indexOf(values.floor) : -1
if (values.floor && floorIndex === -1) {
  throw new Error(`floor ${values.floor} is not in the probed versions`)
}

const results = []
let gatedFailure = false
for (const [i, version] of versions.entries()) {
  const r = await probeOne(browser, version)
  results.push(r)
  const verdict = r.appError
    ? `SESSION FAILED: ${r.appError}`
    : r.viewReady
      ? 'ok (view reached settled state)'
      : r.globalDefined
        ? 'plugin loaded, view did NOT settle'
        : 'plugin global missing'
  const gated = floorIndex !== -1 && i >= floorIndex
  console.log(
    `${version.padEnd(10)} ${verdict}${!r.viewReady && !gated ? ' (below floor, not gated)' : ''}`,
  )
  if (!r.viewReady && r.consoleErrors.length > 0) {
    for (const e of [...new Set(r.consoleErrors)].slice(0, 4)) {
      console.log(`           · ${e}`)
    }
  }
  if (!r.viewReady && gated) {
    gatedFailure = true
  }
}
await browser.close()

if (values.json) {
  fs.writeFileSync(values.json, JSON.stringify(results, null, 2))
}

const firstWorking = results.find(r => r.viewReady)?.version
console.log(`\nOldest probed host that works: ${firstWorking ?? 'none'}`)
if (gatedFailure) {
  console.error(`A host at or above the ${values.floor} floor failed.`)
  process.exit(1)
}
