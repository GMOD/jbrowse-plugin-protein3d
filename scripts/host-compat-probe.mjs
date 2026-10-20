#!/usr/bin/env node
//
// Boots one plugin bundle on hosted JBrowse builds (jbrowse.org/code/jb2/<v>/)
// and reports, per host, whether the session boots, the plugin registers, a
// declarative ProteinView launch settles, right-clicking a gene keeps the
// host's menu rows beside ours, and the console stays clean. With --bundle it
// serves a local build in place of the published one, which makes it a
// pre-publish gate: a throw while the bundle evaluates error-pages every config
// naming the plugin, and neither tsc nor eslint can see one.
//
// Usage:
//   node scripts/host-compat-probe.mjs                       # published bundle
//   node scripts/host-compat-probe.mjs --bundle dist/x.js     # candidate build
//   node scripts/host-compat-probe.mjs --versions main
//
// `latest` names the newest v5 release on npm. Exits non-zero when any probed
// host fails.
//
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

import puppeteer from 'puppeteer'

import { collectPageComplaints } from './browserConsole.mjs'

const OLDEST_SUPPORTED = 'v5.0.0-beta.12'
const DEFAULT_VERSIONS = [OLDEST_SUPPORTED, 'latest', 'main']

// Every host loads the store's `latest/` build, which --bundle replaces, rather
// than the release the store's range would pick for it
const CONFIG =
  'https://jbrowse.org/code/jb2/main/test_data/protein3d_config.json'
const PUBLISHED_ESM =
  'https://jbrowse.org/plugins/jbrowse-plugin-protein3d/latest/dist/jbrowse-plugin-protein3d.esm.js'

// 1YCR does not match the transcript exactly, so its alignment runs in the
// host's RPC worker, proving the worker loaded this bundle: p53 is the
// 13-residue peptide, entity 2, beside MDM2
const LAUNCH_SPEC = {
  views: [
    {
      type: 'ProteinView',
      structures: [{ uniprotId: 'P04637' }, { pdbId: '1YCR' }],
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
    json: { type: 'string' },
    timeout: { type: 'string', default: '90000' },
    bundle: { type: 'string' },
    // the launch fetches real structures, so one miss is more often a network
    // blip than a break; a genuine incompatibility fails every attempt
    retries: { type: 'string', default: '1' },
  },
})
const timeout = Number(values.timeout)
if (values.bundle && !fs.existsSync(values.bundle)) {
  throw new Error(`no bundle at ${values.bundle}`)
}

async function newestV5Release() {
  const response = await fetch(
    'https://registry.npmjs.org/-/package/@jbrowse/core/dist-tags',
  )
  if (!response.ok) {
    throw new Error(`npm dist-tags: HTTP ${response.status}`)
  }
  const tags = await response.json()
  const release = [tags.latest, tags.next].find(v => parseInt(v, 10) >= 5)
  if (!release) {
    throw new Error(`no v5 release among ${JSON.stringify(tags)}`)
  }
  return `v${release}`
}

async function isHosted(version) {
  const response = await fetch(`https://jbrowse.org/code/jb2/${version}/`, {
    method: 'HEAD',
  })
  return response.ok
}

async function resolveVersions(requested) {
  const resolved = []
  for (const name of requested) {
    const version = name === 'latest' ? await newestV5Release() : name
    if (resolved.includes(version)) {
      continue
    }
    if (name === 'latest' && !(await isHosted(version))) {
      console.log(`latest is ${version}, which jbrowse.org does not host yet`)
      continue
    }
    resolved.push(version)
  }
  return resolved
}

const versions = await resolveVersions(
  values.versions?.split(',') ?? DEFAULT_VERSIONS,
)

const configResponse = await fetch(CONFIG)
if (!configResponse.ok) {
  throw new Error(`${CONFIG}: HTTP ${configResponse.status}`)
}
const esmConfig = await configResponse.json()
esmConfig.plugins = [{ name: 'Protein3d', esmUrl: PUBLISHED_ESM }]
const esmConfigBody = Buffer.from(JSON.stringify(esmConfig)).toString('base64')

function url(version, withSpec) {
  const spec = withSpec
    ? `&session=spec-${encodeURIComponent(JSON.stringify(LAUNCH_SPEC))}`
    : ''
  return `https://jbrowse.org/code/jb2/${version}/?config=${encodeURIComponent(CONFIG)}${spec}`
}

// Serves the whole local dist/ by path, because the entry fetches its Mol*
// chunk from dist/chunks/ and answering that with the entry fails every host.
// Scoped through CDP `Fetch.enable` patterns: puppeteer's
// `setRequestInterception(true)` routes every request through node, and with
// it on the hosts booted but launched no view (measured 2026-08-17).
async function interceptConfigAndBundle(page) {
  const dir = values.bundle ? path.dirname(values.bundle) : undefined
  const client = await page.createCDPSession()
  await client.send('Fetch.enable', {
    patterns: [
      { urlPattern: '*protein3d_config.json*', requestStage: 'Request' },
      ...(dir
        ? [
            {
              urlPattern: '*jbrowse-plugin-protein3d*',
              requestStage: 'Request',
            },
          ]
        : []),
    ],
  })
  const fulfill = (requestId, contentType, body) =>
    client
      .send('Fetch.fulfillRequest', {
        requestId,
        responseCode: 200,
        responseHeaders: [
          { name: 'content-type', value: contentType },
          { name: 'access-control-allow-origin', value: '*' },
        ],
        body,
      })
      .then(
        () => true,
        () => false,
      )
  const served = { candidateEntry: 0 }
  client.on('Fetch.requestPaused', async ({ requestId, request }) => {
    const { pathname } = new URL(request.url)
    if (pathname.endsWith('/protein3d_config.json')) {
      fulfill(requestId, 'application/json', esmConfigBody)
      return
    }
    const rel = pathname.split('/dist/').slice(1).join('/dist/')
    const local = path.join(dir ?? '', rel)
    const file =
      !dir || !rel.endsWith('.js')
        ? undefined
        : rel.includes('/')
          ? local
          : values.bundle
    if (file === undefined) {
      client.send('Fetch.continueRequest', { requestId }).catch(() => {})
    } else if (!fs.existsSync(file)) {
      client
        .send('Fetch.failRequest', { requestId, errorReason: 'Failed' })
        .catch(() => {})
    } else if (
      (await fulfill(
        requestId,
        'application/javascript',
        fs.readFileSync(file).toString('base64'),
      )) &&
      file === values.bundle
    ) {
      served.candidateEntry++
    }
  })
  return served
}

// Neither the boot nor the declarative launch touches the context menu, and on
// 2026-08-17 a plugin that evaluated and launched fine still emptied it. The
// click point is where the display reports `featureIdUnderMouse`, the same hit
// test the right-click runs; a fixed offset misses a 10px glyph.
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
      const session = w.JBrowseSession
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
  const hasHostRow = ls => ls.some(l => l.includes('Open feature details'))
  let labels = []
  while (Date.now() < deadline && !hasHostRow(labels)) {
    await new Promise(r => setTimeout(r, 250))
    labels = await page.$$eval('[role="menuitem"]', els =>
      els
        .filter(
          el =>
            !el.closest('[aria-hidden="true"]') &&
            el.getClientRects().length > 0,
        )
        .map(el => el.textContent ?? ''),
    )
  }
  await page.keyboard.press('Escape').catch(() => {})
  return {
    reached: true,
    labels,
    ours: labels.some(l => l.includes('Launch protein view')),
    hostRows: hasHostRow(labels),
  }
}

async function probeOne(browser, version) {
  const page = await browser.newPage()
  const served = await interceptConfigAndBundle(page)
  // `consoleErrors` keeps the excused noise too, printed only beside a failure
  const consoleErrors = []
  const complaints = collectPageComplaints(page, line => {
    consoleErrors.push(line)
  })

  const result = { version, consoleErrors }
  try {
    await page.goto(url(version, true), {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    // the loading spinner is markup too, so wait on the session global or the
    // error page rather than an element
    result.settled = await page
      .waitForFunction(
        () =>
          !!window.JBrowseSession ||
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

    result.registered = await page.evaluate(() =>
      window.JBrowseRootModel?.pluginManager?.plugins?.some(
        p => p.name === 'ProteinViewer',
      ),
    )

    result.viewReady = await page
      .waitForSelector('[data-testid="protein-view-ready"]', { timeout })
      .then(() => true)
      .catch(() => false)

    result.structures = await page.evaluate(() => {
      const w = /** @type {Record<string, any>} */ (window)
      const session = w.JBrowseSession
      return session?.views
        ?.find(v => v.type === 'ProteinView')
        ?.structures?.map(s => ({
          mappedEntityId: s.mappedEntityId,
          error: s.error ? String(s.error) : undefined,
        }))
    })

    result.sessionViews = await page.evaluate(() => {
      const w = /** @type {Record<string, any>} */ (window)
      const session = w.JBrowseSession
      return session?.views?.map(v => v.type)
    })

    result.contextMenu = await probeContextMenu(page)

    result.bodyText = await page.evaluate(() =>
      document.body.innerText.replace(/\s+/g, ' ').slice(0, 200),
    )
  } catch (e) {
    result.threw = String(e).slice(0, 200)
  }
  result.consoleComplaints = complaints()
  result.candidateEntryServed = served.candidateEntry
  await page.close()
  return result
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  defaultViewport: { width: 1400, height: 900 },
})

console.log(
  values.bundle
    ? `serving candidate build ${values.bundle} in place of the published bundle`
    : 'probing the published bundle',
)

const retries = Number(values.retries)

// A host that launched no view asserted nothing, so it fails: excusing it once
// let every host print `ok` while testing only that the bundle evaluated
function specApplied(r) {
  return (r.sessionViews?.length ?? 0) > 0
}

// in blast-radius order, the session error page first
function failure(r) {
  return r.appError
    ? `SESSION FAILED: ${r.appError}`
    : !r.registered
      ? 'plugin not registered'
      : values.bundle && r.candidateEntryServed === 0
        ? `the host never fetched ${values.bundle}, so this probed some other build`
        : !specApplied(r)
          ? 'no view launched, so nothing was asserted'
          : !r.viewReady
            ? 'view did NOT settle'
            : r.structures?.[1]?.mappedEntityId !== '2'
              ? `1YCR mapped the transcript to entity ${r.structures?.[1]?.mappedEntityId}, not the p53 peptide${r.structures?.[1]?.error ? `: ${r.structures[1].error}` : ''}`
              : !r.contextMenu?.reached
                ? `no context menu: ${r.contextMenu?.why}`
                : !r.contextMenu.hostRows
                  ? `the feature context menu lost the host's own rows: [${r.contextMenu.labels.join(' | ')}]`
                  : r.contextMenu.ours
                    ? r.consoleComplaints.length > 0
                      ? `the page complained: ${[...new Set(r.consoleComplaints)].slice(0, 3).join(' / ')}`
                      : undefined
                    : 'no "Launch protein view" row in the feature context menu'
}

async function probeWithRetry(version) {
  let r = await probeOne(browser, version)
  for (let attempt = 0; attempt < retries && failure(r); attempt++) {
    console.log(`${version.padEnd(16)} ${failure(r)}, retrying`)
    r = await probeOne(browser, version)
  }
  return r
}

const results = []
let failed = false
for (const version of versions) {
  const r = await probeWithRetry(version)
  results.push(r)
  const bad = failure(r)
  const verdict = bad
    ? bad
    : 'ok (view settled, feature context menu intact, console clean)'
  console.log(`${version.padEnd(16)} ${verdict}`)
  if (bad && r.consoleErrors.length > 0) {
    for (const e of [...new Set(r.consoleErrors)].slice(0, 4)) {
      console.log(`${' '.repeat(17)}· ${e}`)
    }
  }
  if (bad) {
    failed = true
  }
}
await browser.close()

if (values.json) {
  fs.writeFileSync(values.json, JSON.stringify(results, null, 2))
}

if (failed) {
  console.error('A probed host failed.')
  process.exit(1)
}
