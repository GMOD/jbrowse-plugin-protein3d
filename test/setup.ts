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
}
interface SessionView {
  type: string
  structures?: ProteinViewStructure[]
  tracks?: { displays?: { featureIdUnderMouse?: string }[] }[]
}
declare global {
  interface Window {
    JBrowseSession?: { views?: SessionView[] }
    JBrowsePluginProtein3d?: unknown
  }
}

/**
 * Set up a local JBrowse instance for testing.
 * Assumes `jbrowse create .test-jbrowse` was already run by the pretest script.
 */
export function setupJBrowse() {
  console.log('Setting up JBrowse test instance...')

  if (!fs.existsSync(TEST_JBROWSE_DIR)) {
    throw new Error(
      `JBrowse directory not found at ${TEST_JBROWSE_DIR}. ` +
        `Run: npm run test:setup:version ${TEST_JBROWSE_VERSION}`,
    )
  }

  console.log(`Testing against JBrowse version: ${TEST_JBROWSE_VERSION}`)

  // Build the plugin bundle (uses build:bundle to skip type checking for faster iteration)
  // Set SKIP_BUILD=1 to skip if dist already exists
  const distDir = path.join(process.cwd(), 'dist')
  const skipBuild =
    process.env.SKIP_BUILD === '1' || process.env.SKIP_BUILD === 'true'

  if (skipBuild && fs.existsSync(distDir)) {
    console.log('Skipping build (SKIP_BUILD is set and dist exists)')
  } else {
    console.log('Building plugin bundle...')
    fs.rmSync(distDir, { recursive: true, force: true })
    execSync('npm run build:bundle', {
      cwd: process.cwd(),
      stdio: 'inherit',
      timeout: 120_000,
    })
  }

  // Copy the distconfig.json to JBrowse directory as config.json
  console.log('Setting up config...')
  const testConfig = createTestConfig()
  fs.writeFileSync(
    path.join(TEST_JBROWSE_DIR, 'config.json'),
    JSON.stringify(testConfig, null, 2),
  )

  // Copy the plugin dist to JBrowse directory
  console.log('Copying plugin...')
  const pluginDir = path.join(TEST_JBROWSE_DIR, 'plugin')
  fs.rmSync(pluginDir, { recursive: true, force: true })
  fs.mkdirSync(pluginDir, { recursive: true })
  fs.cpSync(distDir, pluginDir, { recursive: true })

  console.log('JBrowse test instance ready!')
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
    console.log(`Killed any existing process on port ${port}`)
  } catch {
    // Ignore errors - port might not be in use
  }
}

export async function startJBrowseServer(): Promise<ChildProcess> {
  console.log(`Starting JBrowse server on port ${JBROWSE_PORT}...`)

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
        console.log(
          `Server reported port: ${actualPort}, expected: ${JBROWSE_PORT}`,
        )

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
          console.log('JBrowse server started!')
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

// Uncaught exceptions seen in the page, so a test can assert the app never
// error-paged. Reset per page.
export const pageErrors: string[] = []

export async function createJBrowsePage(browser: Browser): Promise<Page> {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  pageErrors.length = 0

  page.on('console', msg => {
    console.log(`[browser ${msg.type()}] ${msg.text()}`)
  })

  page.on('pageerror', err => {
    console.log(`[browser page error] ${err.message}`)
    pageErrors.push(err.message)
  })

  page.on('requestfailed', request => {
    console.log(
      `[request failed] ${request.url()}: ${request.failure()?.errorText}`,
    )
  })

  const jbrowseUrl = `http://localhost:${JBROWSE_PORT}/`
  console.log(`Navigating to: ${jbrowseUrl}`)
  await page.goto(jbrowseUrl, { waitUntil: 'networkidle2', timeout: 60_000 })

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
  console.log(`feature ${featureId} at (${x.toFixed(0)}, ${y.toFixed(0)})`)
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
export const LAUNCH_BUTTON = '[data-testid="protein-launch-button"]'
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
    }
  })
}

// Fraction of the molstar canvas that is not blank. Read back from a real
// screenshot rather than the WebGL buffer so it does not depend on molstar
// preserving its drawing buffer.
async function molstarInk(page: Page): Promise<number> {
  // Clipped to the viewport: the viewer usually runs off the bottom of the page,
  // and pixels outside the viewport come back blank.
  const clip = await page.$eval('[class*="msp-plugin"] canvas', el => {
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
