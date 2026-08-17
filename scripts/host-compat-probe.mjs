#!/usr/bin/env node
//
// Probes one plugin bundle against many hosted JBrowse builds and reports, per
// host version, whether the session boots, the UMD global is defined, the view
// type registered, a declarative ProteinView launch reaches its settled state,
// and right-clicking a gene still opens a feature context menu carrying both
// the plugin's row and the host's own.
//
// jbrowse.org/code/jb2/<vX.Y.Z>/ hosts every release, so the matrix needs no
// `jbrowse create` per version.
//
// With --bundle it serves a LOCAL build in place of the published one by request
// interception, which turns this from a report on production into a pre-publish
// gate. That distinction is the whole point: the store uploads `latest/` with
// no-cache, so a publish is a live change to configs shipped months ago, and
// "does this build error-page the app" has to be answerable before the tag, not
// after. The failure modes are a runtime throw while the UMD evaluates -- an
// import the host does not re-export, or a barrel export that disappeared --
// and a throw while the plugin contributes to the host's UI, which costs the
// user the whole feature menu. No amount of type checking or linting in this
// repo can rule either out.
//
// Usage:
//   node scripts/host-compat-probe.mjs                       # published bundle
//   node scripts/host-compat-probe.mjs --bundle dist/x.js     # candidate build
//   node scripts/host-compat-probe.mjs --versions v4.0.0,main --floor v4.0.0
//
import fs from 'node:fs'
import path from 'node:path'
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
    // Path to a local umd build to serve in place of the published one.
    bundle: { type: 'string' },
    // Re-probes a host that did not settle. The launch fetches real structures
    // from the network, so a single miss is more often a blip than a break, and
    // a release gate that fails on blips gets bypassed. A genuine
    // incompatibility fails every attempt.
    retries: { type: 'string', default: '1' },
  },
})
const versions = values.versions?.split(',') ?? DEFAULT_VERSIONS
const timeout = Number(values.timeout)
if (values.bundle && !fs.existsSync(values.bundle)) {
  throw new Error(`no bundle at ${values.bundle}`)
}

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

// The config names the plugin at its version-agnostic store path, so serving a
// candidate build means answering requests under that path from the local dist
// instead.
//
// Resolving by BASENAME rather than matching the package name is load-bearing:
// this build code-splits Mol* into a content-hashed molstar-chunk-*.js that the
// main bundle fetches as a sibling. A matcher that answered every
// `jbrowse-plugin-protein3d/**.js` with the main bundle handed that chunk
// request the umd, and the run failed with "DefaultPluginUISpec is not a
// function" on every host -- a probe artifact indistinguishable from a real
// incompatibility. A gate that cries wolf gets ignored, so it has to serve the
// whole directory, not one file.
//
// SCOPED to the plugin's own assets through CDP `Fetch.enable` patterns, rather
// than puppeteer's `page.setRequestInterception(true)`, which routes EVERY
// request through node. That routing is not free: with it on, v4.3.0, latest
// and main booted the config and then sat on "Select a view to launch" with
// `session.views` empty and not one console message, while the same url in a
// plain browser opened both views. Passthrough interception -- serving nothing
// local, `continue()` on everything -- reproduced it, so the bundle was never
// the variable. Measured 2026-08-17.
//
// The cost was not a red run, which is what makes it worth this comment: no
// views meant `specApplied` was false, `viewReady` was excused, and the probe
// printed `ok` for the three hosts anyone cares about while asserting nothing
// beyond "the umd evaluated". `failure()` now treats an unapplied spec as a
// failure, so this can never quietly degrade to a smoke test again.
async function serveCandidateBundle(page) {
  const dir = path.dirname(values.bundle)
  const mainName = path.basename(values.bundle)
  const client = await page.createCDPSession()
  await client.send('Fetch.enable', {
    patterns: [
      { urlPattern: '*jbrowse-plugin-protein3d*', requestStage: 'Request' },
    ],
  })
  client.on('Fetch.requestPaused', ({ requestId, request }) => {
    const name = path.basename(new URL(request.url).pathname)
    const local = path.join(dir, name)
    // the published umd name and the local one can differ, so the config's
    // bundle request maps to --bundle by position; siblings map by name
    const file = !name.endsWith('.js')
      ? undefined
      : name !== mainName && fs.existsSync(local)
        ? local
        : values.bundle
    if (file === undefined) {
      client.send('Fetch.continueRequest', { requestId }).catch(() => {})
    } else {
      client
        .send('Fetch.fulfillRequest', {
          requestId,
          responseCode: 200,
          responseHeaders: [
            { name: 'content-type', value: 'application/javascript' },
            { name: 'access-control-allow-origin', value: '*' },
          ],
          body: fs.readFileSync(file).toString('base64'),
        })
        .catch(() => {})
    }
  })
}

// Right-click a gene in the connected view and read the menu back. This is the
// half the probe was missing: booting the umd only proves it evaluates, and the
// declarative launch above enters through `LaunchView-ProteinView`, so neither
// touches the context menu the plugin actually contributes to. Both outages
// this file's header names -- the deep @mui import, the vanished core export --
// happened at evaluation and so were catchable without it. The one on
// 2026-08-17 was not: the umd evaluated, the global was defined, the launch
// settled, and right-clicking a feature produced NO menu at all, because the
// plugin called the display's super view detached and the host's own
// `this.isGeneLike` threw inside the ErrorBoundary the menu builds in.
//
// The click point comes from the host: hover until the display reports
// `featureIdUnderMouse`, which is the same hit test the right-click runs. Do not
// reintroduce a fixed offset -- a 10px-tall glyph moving two pixels then reads
// as a broken menu.
async function probeContextMenu(page) {
  const container = await page.$('[data-testid^="trackRenderingContainer-"]')
  if (!container) {
    return { reached: false, why: 'no track container in the connected view' }
  }
  const box = await container.evaluate(el => {
    const { left, right, top, bottom } = el.getBoundingClientRect()
    return { left, right, top, bottom }
  })
  const featureAt = () =>
    page.evaluate(() => {
      const w = /** @type {Record<string, any>} */ (window)
      const session = w.JBrowseSession ?? w.__jbrowse_session
      const view = session?.views?.find(v => v.type === 'LinearGenomeView')
      return view?.tracks?.[0]?.displays?.[0]?.featureIdUnderMouse
    })

  let point
  for (let y = box.top + 1; y < box.bottom && !point; y += 2) {
    for (const fraction of [0.5, 0.35, 0.65, 0.2, 0.8]) {
      const x = box.left + (box.right - box.left) * fraction
      await page.mouse.move(x, y)
      if (await featureAt()) {
        point = { x, y }
        break
      }
    }
  }
  if (!point) {
    return { reached: false, why: 'the host reported no feature in the track' }
  }

  await page.mouse.click(point.x, point.y, { button: 'right' })
  const deadline = Date.now() + 5000
  let labels = []
  while (Date.now() < deadline && labels.length === 0) {
    labels = await page.$$eval('[role="menuitem"]', els =>
      els.map(el => el.textContent ?? ''),
    )
    if (labels.length === 0) {
      await new Promise(r => setTimeout(r, 250))
    }
  }
  await page.keyboard.press('Escape').catch(() => {})
  return {
    reached: true,
    labels,
    // Ours, and the host's own. A plugin that throws while contributing takes
    // the whole menu down with it, so asserting only on our row would call that
    // outage a missing feature.
    ours: labels.some(l => l.includes('Launch protein view')),
    hostRows: labels.some(l => l.includes('Open feature details')),
  }
}

async function probeOne(browser, version) {
  const page = await browser.newPage()
  if (values.bundle) {
    await serveCandidateBundle(page)
  }
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

    result.contextMenu = await probeContextMenu(page)

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

console.log(
  values.bundle
    ? `serving candidate build ${values.bundle} in place of the published bundle`
    : 'probing the published bundle',
)

const retries = Number(values.retries)

// A host that produced no view asserted nothing about the plugin, so this is a
// failed probe rather than a passing one. It used to be excused -- the theory
// was that newer hosts ignore the session spec -- and that excuse covered
// v4.3.0, latest and main for as long as the probe intercepted every request
// (see serveCandidateBundle). The three hosts that matter most reported `ok`
// while testing nothing. An excuse a check applies to itself is indistinguishable
// from a pass, so there isn't one any more.
function specApplied(r) {
  return (r.sessionViews?.length ?? 0) > 0
}

// What must hold for a build to be safe to publish, in blast-radius order. The
// first is the one that has actually bitten twice: a throw while the UMD
// evaluates leaves the global undefined and error-pages every config naming it.
// The rest are functional, and each covers a failure the one above it does not
// see -- the context menu most of all, since a plugin that throws while
// contributing to it takes the host's own rows down with it and never touches
// the launch path at all.
function failure(r) {
  return r.appError
    ? `SESSION FAILED: ${r.appError}`
    : !r.globalDefined
      ? 'plugin global missing'
      : !specApplied(r)
        ? 'no view launched, so nothing was asserted'
        : !r.viewReady
          ? 'view did NOT settle'
          : !r.contextMenu?.reached
            ? `no context menu: ${r.contextMenu?.why}`
            : !r.contextMenu.hostRows
              ? `the feature context menu lost the host's own rows: [${r.contextMenu.labels.join(' | ')}]`
              : r.contextMenu.ours
                ? undefined
                : 'no "Launch protein view" row in the feature context menu'
}

async function probeWithRetry(version) {
  let r = await probeOne(browser, version)
  for (let attempt = 0; attempt < retries && failure(r); attempt++) {
    console.log(`${version.padEnd(10)} ${failure(r)}, retrying`)
    r = await probeOne(browser, version)
  }
  return r
}

const results = []
let gatedFailure = false
for (const [i, version] of versions.entries()) {
  const r = await probeWithRetry(version)
  results.push(r)
  const bad = failure(r)
  const verdict = bad ? bad : 'ok (view settled, feature context menu intact)'
  const gated = floorIndex !== -1 && i >= floorIndex
  console.log(
    `${version.padEnd(10)} ${verdict}${bad && !gated ? ' (below floor, not gated)' : ''}`,
  )
  if (bad && r.consoleErrors.length > 0) {
    for (const e of [...new Set(r.consoleErrors)].slice(0, 4)) {
      console.log(`           · ${e}`)
    }
  }
  if (bad && gated) {
    gatedFailure = true
  }
}
await browser.close()

if (values.json) {
  fs.writeFileSync(values.json, JSON.stringify(results, null, 2))
}

const firstWorking = results.find(r => !failure(r))?.version
console.log(`\nOldest probed host that works: ${firstWorking ?? 'none'}`)
if (gatedFailure) {
  console.error(`A host at or above the ${values.floor} floor failed.`)
  process.exit(1)
}
