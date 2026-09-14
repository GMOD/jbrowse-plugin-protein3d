import { type ChildProcess, execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { PNG } from 'pngjs'
import { launch } from 'puppeteer'

import { saveStableScreenshot } from '../scripts/pngSnapshot.mjs'

import type { Browser, Page } from 'puppeteer'

export const JBROWSE_PORT = 9876
export const VIEW_ID = 'test_lgv'
export const TRACK_ID = 'gencode.v44.annotation.sorted.gff3'

const TRACK_CONTAINER = `[data-testid="trackRenderingContainer-${VIEW_ID}-${TRACK_ID}"]`

// Support testing against different JBrowse versions via TEST_JBROWSE_VERSION env var
// e.g., TEST_JBROWSE_VERSION=v3.7.0 or TEST_JBROWSE_VERSION=v4.0.4
const TEST_JBROWSE_VERSION = process.env.TEST_JBROWSE_VERSION || 'nightly'
const TEST_JBROWSE_DIR = path.join(
  process.cwd(),
  `.test-jbrowse-${TEST_JBROWSE_VERSION}`,
)

// The structure and its genome<->protein mapping live on the session, so the
// tests can assert on what was actually loaded rather than on DOM shape.
interface ProteinViewStructure {
  structureSequences?: string[]
  pairwiseAlignment?: unknown
  userProvidedTranscriptSequence?: string
  feature?: { name?: string; id?: string }
  genomeToTranscriptSeqMapping?: { g2p: Record<string, number> }
  mappedEntityId?: string
  url?: string
  clickedStructureRange?: { start: number; end: number }
  residueNumber?: (pos: number) => number
}
interface SessionView {
  type: string
  structures?: ProteinViewStructure[]
  tracks?: { displays?: { featureIdUnderMouse?: string }[] }[]
}
declare global {
  interface Window {
    JBrowseSession?: {
      views?: SessionView[]
      removeView?: (view: SessionView) => void
    }
    JBrowsePluginProtein3d?: unknown
  }
}

/**
 * Set up a local JBrowse instance for testing.
 * Assumes `jbrowse create .test-jbrowse` was already run by the pretest script.
 */
export function setupJBrowse() {
  if (!fs.existsSync(TEST_JBROWSE_DIR)) {
    throw new Error(
      `JBrowse directory not found at ${TEST_JBROWSE_DIR}. ` +
        `Run: npm run test:setup:version ${TEST_JBROWSE_VERSION}`,
    )
  }

  // Build the plugin bundle (uses build:bundle to skip type checking for faster iteration)
  // Set SKIP_BUILD=1 to skip if dist already exists
  const distDir = path.join(process.cwd(), 'dist')
  const skipBuild =
    process.env.SKIP_BUILD === '1' || process.env.SKIP_BUILD === 'true'

  if (!skipBuild || !fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true })
    // Piped rather than inherited: a build that works has nothing to say, and
    // its banner would be the loudest thing in a green run.
    try {
      execSync('npm run build:bundle', {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 120_000,
      })
    } catch (e) {
      const { stdout, stderr } = e as { stdout?: Buffer; stderr?: Buffer }
      console.error(`${stdout ?? ''}${stderr ?? ''}`)
      throw e
    }
  }

  // Copy the distconfig.json to JBrowse directory as config.json
  const testConfig = createTestConfig()
  fs.writeFileSync(
    path.join(TEST_JBROWSE_DIR, 'config.json'),
    JSON.stringify(testConfig, null, 2),
  )

  // Copy the plugin dist to JBrowse directory
  const pluginDir = path.join(TEST_JBROWSE_DIR, 'plugin')
  fs.rmSync(pluginDir, { recursive: true, force: true })
  fs.mkdirSync(pluginDir, { recursive: true })
  fs.cpSync(distDir, pluginDir, { recursive: true })
}

function createTestConfig() {
  return {
    plugins: [
      {
        name: 'Protein3d',
        url: `http://localhost:${JBROWSE_PORT}/plugin/jbrowse-plugin-protein3d.umd.production.min.js`,
      },
    ],
    assemblies: [
      {
        name: 'hg38',
        aliases: ['GRCh38'],
        sequence: {
          type: 'ReferenceSequenceTrack',
          trackId: 'P6R5xbRqRr',
          adapter: {
            type: 'BgzipFastaAdapter',
            uri: 'https://jbrowse.org/genomes/GRCh38/fasta/hg38.prefix.fa.gz',
          },
        },
        refNameAliases: {
          adapter: {
            type: 'RefNameAliasAdapter',
            uri: 'https://s3.amazonaws.com/jbrowse.org/genomes/GRCh38/hg38_aliases.txt',
          },
        },
      },
    ],
    tracks: [
      {
        type: 'FeatureTrack',
        trackId: TRACK_ID,
        name: 'GENCODE v44',
        category: ['Annotation'],
        adapter: {
          type: 'Gff3TabixAdapter',
          uri: 'https://jbrowse.org/demos/app/gencode.v44.annotation.sorted.gff3.gz',
        },
        assemblyNames: ['hg38'],
      },
    ],
    defaultSession: {
      name: 'Test session',
      views: [
        {
          id: VIEW_ID,
          type: 'LinearGenomeView',
          init: {
            loc: 'chr1:114,704,469-114,716,894',
            assembly: 'hg38',
            tracks: [TRACK_ID],
          },
        },
      ],
    },
  }
}

let jbrowseServer: ChildProcess | undefined

function killProcessOnPort(port: number): void {
  try {
    // Find and kill any process using the port
    execSync(`lsof -ti:${port} | xargs -r kill -9 2>/dev/null || true`, {
      stdio: 'ignore',
    })
  } catch {
    // Ignore errors - port might not be in use
  }
}

export async function startJBrowseServer(): Promise<ChildProcess> {
  // Kill any existing process on the port
  killProcessOnPort(JBROWSE_PORT)

  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['serve', '-p', String(JBROWSE_PORT), '-s', TEST_JBROWSE_DIR],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    const timeout = setTimeout(() => {
      proc.kill()
      reject(new Error(`Server did not start within 30000ms`))
    }, 30_000)

    const onData = (data: Buffer) => {
      const str = data.toString()

      // Extract port from message like "Accepting connections at http://localhost:9876"
      const match = /Accepting connections at http:\/\/localhost:(\d+)/.exec(
        str,
      )
      if (match) {
        const actualPort = Number.parseInt(match[1], 10)
        if (actualPort !== JBROWSE_PORT) {
          clearTimeout(timeout)
          proc.kill()
          reject(
            new Error(
              `Server started on wrong port ${actualPort}, expected ${JBROWSE_PORT}`,
            ),
          )
          return
        }

        clearTimeout(timeout)
        jbrowseServer = proc

        // Give server a moment to be fully ready, then resolve
        setTimeout(() => {
          resolve(proc)
        }, 500)
      }
    }

    proc.stdout.on('data', onData)
    proc.stderr.on('data', onData)

    proc.on('error', err => {
      clearTimeout(timeout)
      reject(err)
    })

    proc.on('exit', code => {
      if (code !== 0 && code !== null) {
        clearTimeout(timeout)
        reject(new Error(`Server exited with code ${code}`))
      }
    })
  })
}

export async function stopServer(proc: ChildProcess): Promise<void> {
  return new Promise(resolve => {
    if (proc.killed) {
      resolve()
      return
    }
    proc.on('close', () => {
      resolve()
    })
    proc.kill('SIGTERM')
    setTimeout(() => {
      if (!proc.killed) {
        proc.kill('SIGKILL')
      }
      resolve()
    }, 5000)
  })
}

export async function cleanupJBrowse(): Promise<void> {
  if (jbrowseServer) {
    await stopServer(jbrowseServer)
  }
}

export async function launchBrowser(headless = true): Promise<Browser> {
  return launch({
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
}

// What the host is allowed to say. Everything else the page logs at warn or
// error fails the test that was running, because a console line is the only
// place several host incompatibilities have ever shown themselves: the bundle
// that resolved a missing re-export, the menu contribution that threw inside an
// ErrorBoundary, the MUI major whose SvgIcon had a different shape. None of
// those reach tsc, eslint or a url check, and a run that merely prints them
// relies on somebody reading the scrollback.
//
// The first group is upstream's own list, kept in step with
// `products/jbrowse-capture/src/browser.ts` in jbrowse-components, and it
// carries upstream's rule: a real GPU failure (`context LOST`, `GL error`) is
// NOT noise. CI has no GPU, so swiftshader narrates.
const GPU_NOISE = [
  'favicon',
  'GPU stall',
  '[GPU] WebGPU not supported',
  '[GPU] No compatible GPU adapter',
  '[GPU] WebGPU initialization failed',
  '[GPU] WebGL2 unavailable',
  '[GPU] WebGPU device creation failed',
  '[GPU] WebGL2 here is software-rendered',
  'GroupMarkerNotSet',
  'Automatic fallback to software WebGL',
  'No available adapters',
  'Failed to create WebGPU Context Provider',
]

// Warnings this plugin has read and owes a fix for. Each one is a debt with an
// exit condition, not a decision to stop looking — delete the entry and the
// gate starts failing on it again.
const KNOWN_DEBT = [
  // v5 unwraps v4's nested `init` and warns; v4.3.0's LinearGenomeView has no
  // other way in (`init: types.frozen<InitState>()` plus the autorun in
  // `afterAttach.ts` that reads it), so `addView` in
  // LaunchProteinViewExtensionPoint has to keep writing it while a v4 host is
  // supported. Drop the nesting there, and this entry, together with v4.
  'nests its settings under "init"',
]

export function isBrowserConsoleNoise(text: string): boolean {
  if (text.includes('[WebGL2Hal #')) {
    return !text.includes('context LOST') && !text.includes('GL error')
  }
  return [...GPU_NOISE, ...KNOWN_DEBT].some(n => text.includes(n))
}

// Everything the page said that the list above does not excuse: uncaught
// exceptions, console errors, console warnings.
const pageComplaints: string[] = []

function complain(text: string) {
  if (!isBrowserConsoleNoise(text)) {
    pageComplaints.push(text)
  }
}

// Drains, so each test reports what it provoked rather than inheriting an
// earlier test's complaint and failing six times over one cause.
export function pageComplaintsSince(): string[] {
  return pageComplaints.splice(0)
}

export async function createJBrowsePage(browser: Browser): Promise<Page> {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  pageComplaints.length = 0

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warn') {
      complain(`[browser ${msg.type()}] ${msg.text()}`)
    }
  })

  page.on('pageerror', err => {
    complain(`[browser page error] ${err.message}`)
  })

  // Third-party beacons fail in a sandboxed run and say nothing about the
  // plugin; a request the app itself made is a different matter.
  page.on('requestfailed', request => {
    const url = request.url()
    if (url.startsWith(`http://localhost:${JBROWSE_PORT}/`)) {
      complain(`[request failed] ${url}: ${request.failure()?.errorText}`)
    }
  })

  await page.goto(`http://localhost:${JBROWSE_PORT}/`, {
    waitUntil: 'networkidle2',
    timeout: 60_000,
  })

  return page
}

// Captures are held in memory and written by flushScreenshots at the end of the
// run. The PNGs under test-screenshots/ are committed references: a failing run
// captures a broken app, so those captures must not overwrite them.
const captures: { filePath: string; buffer: Uint8Array }[] = []

export async function captureScreenshot(
  page: Page,
  filePath: string,
): Promise<void> {
  captures.push({ filePath, buffer: await page.screenshot() })
}

export function flushScreenshots(redirectDir?: string): void {
  for (const { filePath, buffer } of captures.splice(0)) {
    saveStableScreenshot(
      buffer,
      redirectDir ? path.join(redirectDir, path.basename(filePath)) : filePath,
    )
  }
}

export async function waitForJBrowseLoad(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="tracksContainer"]', {
    timeout: 30_000,
  })
  await page.waitForSelector(TRACK_CONTAINER, { timeout: 60_000 })
}

// Painted features, in every shape the hosts under test render them. v3 emits
// svg boxes; v4 server-side renders each block to its own canvas and suffixes
// that canvas's testid with `_done`. Current main deleted the block-based
// display (jbrowse-components 8b1dacf9ff): the display is one GPU canvas with
// no testid at all, and the signal moved to the display wrapper.
//
// That wrapper keeps changing shape, so this list is append-only and every
// entry is a host still under test — dropping one silently stops testing that
// host. The previous entry assumed `data-display-phase` sat on a DESCENDANT of
// the `-done` element (note the space); main has since collapsed them onto one
// element, so that selector quietly matched nothing and the nightly job timed
// out waiting for a track that had in fact rendered.
//
// Prefer the most explicit signal main now offers: `data-display-drawn` is
// literally "something has been drawn", which is what the older two-part check
// was approximating. Both conditions are kept because neither alone is enough —
// `-done` flips on an empty canvas while the fetch is still in flight, and
// `ready` is reachable before anything has been drawn.
export const PAINTED_FEATURES = [
  // v4 block-based canvases
  'canvas[data-testid$="_done"]',
  // v3 svg boxes
  '[data-testid^="box-"]',
  // main, while phase lived on a child of the -done wrapper
  '[data-testid$="-done"] [data-display-phase="ready"]',
  // main today: one wrapper carrying both flags
  '[data-display-drawn="true"][data-display-phase="ready"]',
].join(', ')

export async function waitForTrackLoad(page: Page): Promise<void> {
  await page.waitForSelector(PAINTED_FEATURES, { timeout: 60_000 })
}

async function readMenuItems(page: Page, timeout = 2000): Promise<string[]> {
  const deadline = Date.now() + timeout
  let items: string[] = []
  while (Date.now() < deadline && items.length === 0) {
    items = await page.$$eval('[role="menuitem"]', els =>
      els.map(el => el.textContent ?? ''),
    )
    if (items.length === 0) {
      await new Promise(r => setTimeout(r, 200))
    }
  }
  return items
}

// Where a feature is, according to the host rather than to us. Hovering sets
// `featureIdUnderMouse` on the display on every host under test, and it is the
// same hit test the right-click itself runs, so a point that answers here is a
// point whose context menu is the feature's.
//
// Nothing about the glyph's placement is written down here on purpose. The
// previous version right-clicked a hardcoded 10px below the track container,
// which stopped landing on a 10px-tall glyph the moment the row moved by two
// pixels, and reported it as "no context menu" -- a layout change wearing the
// costume of a broken menu.
async function findFeature(page: Page) {
  const box = await page.$eval(TRACK_CONTAINER, el => {
    const { left, right, top, bottom } = el.getBoundingClientRect()
    return { left, right, top, bottom }
  })
  for (let y = box.top + 1; y < box.bottom; y += 2) {
    for (const fraction of [0.5, 0.35, 0.65, 0.2, 0.8]) {
      const x = box.left + (box.right - box.left) * fraction
      await page.mouse.move(x, y)
      const featureId = await page.evaluate(
        () =>
          window.JBrowseSession?.views?.find(v => v.type === 'LinearGenomeView')
            ?.tracks?.[0]?.displays?.[0]?.featureIdUnderMouse,
      )
      if (featureId) {
        return { x, y, featureId }
      }
    }
  }
  throw new Error(
    `the host reported no feature anywhere in the track container ${JSON.stringify(box)}`,
  )
}

/**
 * Right-click a feature and return the context menu's items.
 */
export async function openFeatureContextMenu(page: Page): Promise<string[]> {
  const { x, y, featureId } = await findFeature(page)
  await page.mouse.click(x, y, { button: 'right' })
  const items = await readMenuItems(page)
  if (items.length === 0) {
    // The host put a feature here and then opened nothing, so this is a broken
    // menu rather than a missed click. A plugin can cause it: the menu builds
    // inside an ErrorBoundary, so anything thrown while assembling the items
    // leaves the user with no menu at all.
    throw new Error(
      `right-clicking feature ${featureId} at (${x.toFixed(0)}, ${y.toFixed(0)}) opened no menu`,
    )
  }
  return items
}

export async function clickTab(page: Page, label: string): Promise<void> {
  for (const tab of await page.$$('[role="tab"]')) {
    const text = await tab.evaluate(el => el.textContent ?? '')
    if (text.includes(label)) {
      await tab.click()
      return
    }
  }
  throw new Error(`no tab labelled "${label}"`)
}

export async function clickMenuItem(page: Page, label: string): Promise<void> {
  for (const item of await page.$$('[role="menuitem"]')) {
    const text = await item.evaluate(el => el.textContent ?? '')
    if (text.includes(label)) {
      await item.click()
      return
    }
  }
  throw new Error(`no context menu item labelled "${label}"`)
}

// Selectors for the plugin's OWN UI. Unlike the host-DOM selectors above these
// are stable by construction: the e2e always builds and installs the plugin
// from this working tree, so only the JBrowse version varies underneath. Match
// on these rather than on button labels or a library's internal class names.
// Every tab renders its own launch button and TabPanel keeps hidden tabs
// mounted, so an unscoped selector matches the AlphaFoldDB tab's button from
// any tab -- enabled, invisible, and unclickable. Scope to the visible panel.
export const LAUNCH_BUTTON =
  '[role="tabpanel"]:not([hidden]) [data-testid="protein-launch-button"]'
export const LAUNCH_DIALOG = '[data-testid="launch-protein-view-dialog"]'
export const MOLSTAR_CANVAS = '[data-testid="protein-view-molstar"] canvas'

// The dialog resolves the transcript, isoform sequences and structure file over
// the network before it will let you launch.
export async function waitForLaunchEnabled(page: Page): Promise<void> {
  await page.waitForSelector(`${LAUNCH_BUTTON}:not([disabled])`, {
    timeout: 90_000,
  })
}

export async function clickLaunch(page: Page): Promise<void> {
  const button = await page.$(LAUNCH_BUTTON)
  if (!button) {
    throw new Error(`no element matching ${LAUNCH_BUTTON} in the dialog`)
  }
  await button.click()
}

export async function getProteinViewState(page: Page) {
  return page.evaluate(() => {
    const view = window.JBrowseSession?.views?.find(
      v => v.type === 'ProteinView',
    )
    const structure = view?.structures?.[0]
    const mapping = structure?.genomeToTranscriptSeqMapping
    return {
      structureCount: view?.structures?.length ?? 0,
      structureSeqLength: structure?.structureSequences?.[0]?.length ?? 0,
      transcriptLength: structure?.userProvidedTranscriptSequence?.length ?? 0,
      transcriptName: structure?.feature?.name ?? structure?.feature?.id ?? '',
      hasAlignment: Boolean(structure?.pairwiseAlignment),
      mappedGenomePositions: mapping ? Object.keys(mapping.g2p).length : 0,
      structures: (view?.structures ?? []).map(s => ({
        url: s.url ?? '',
        entityCount: s.structureSequences?.length ?? 0,
        hasAlignment: Boolean(s.pairwiseAlignment),
        mappedEntityId: s.mappedEntityId,
      })),
    }
  })
}

// Open a session spec on the test instance, the way a shared link does.
export async function openSessionSpec(page: Page, spec: object) {
  const url = `http://localhost:${JBROWSE_PORT}/?session=spec-${encodeURIComponent(JSON.stringify(spec))}`
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 })
}

// Fraction of the molstar canvas that is not blank. Read back from a real
// screenshot rather than the WebGL buffer so it does not depend on molstar
// preserving its drawing buffer.
async function molstarInk(page: Page): Promise<number> {
  // Scrolled into view and clipped to the viewport: alignment panels above the
  // viewer push it below the fold, and pixels outside the viewport come back
  // blank.
  const clip = await page.$eval('[class*="msp-plugin"] canvas', el => {
    el.scrollIntoView({ block: 'nearest' })
    const { x, y, width, height } = el.getBoundingClientRect()
    return {
      x,
      y,
      width: Math.min(width, window.innerWidth - x),
      height: Math.min(height, window.innerHeight - y),
    }
  })
  const { data, width, height } = PNG.sync.read(
    Buffer.from(await page.screenshot({ clip })),
  )
  let inked = 0
  for (let i = 0; i < data.length; i += 4) {
    const darkness = 765 - data[i]! - data[i + 1]! - data[i + 2]!
    if (darkness > 30) {
      inked++
    }
  }
  return inked / (width * height)
}

// The molstar canvas mounts within a second of the launch click, ~5s before the
// structure is drawn, so waiting on the element alone would screenshot an empty
// viewer — hence the ink check below.
export async function waitForStructureRendered(page: Page): Promise<number> {
  await page.waitForSelector(MOLSTAR_CANVAS, { timeout: 30_000 })
  const deadline = Date.now() + 90_000
  let ink = 0
  while (Date.now() < deadline) {
    ink = await molstarInk(page)
    if (ink > 0.005) {
      return ink
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error(
    `molstar canvas still blank after 90s (ink=${ink.toFixed(4)})`,
  )
}
