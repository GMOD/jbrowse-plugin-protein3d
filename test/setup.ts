import { type ChildProcess, execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { PNG } from 'pngjs'
import { launch } from 'puppeteer'

import { isBrowserConsoleNoise } from '../scripts/browserConsole.mjs'
import { saveStableScreenshot } from '../scripts/pngSnapshot.mjs'

import type { Browser, Page } from 'puppeteer'

export const JBROWSE_PORT = Number(process.env.JBROWSE_PORT ?? 9876)
export const VIEW_ID = 'test_lgv'
export const TRACK_ID = 'gencode.v44.annotation.sorted.gff3'

const TRACK_CONTAINER = `[data-testid="trackRenderingContainer-${VIEW_ID}-${TRACK_ID}"]`

const TEST_JBROWSE_DIR = path.join(process.cwd(), '.test-jbrowse-nightly')

// The structure and its genome<->protein mapping live on the session, so the
// tests can assert on what was actually loaded rather than on DOM shape.
interface ProteinViewStructure {
  hoverPosition?: { structureSeqPos: number; source: string }
  hoverGenomeLocus?: string
  structureSequences?: string[]
  pairwiseAlignment?: unknown
  userProvidedTranscriptSequence?: string
  feature?: { name?: string; id?: string }
  genomeToTranscriptSeqMapping?: {
    g2p: Record<string, number>
    refName: string
  }
  mappedEntityId?: string
  url?: string
  clickedStructureRanges?: { start: number; end: number }[]
  residueNumber?: (pos: number) => number
  label?: string
  hidden?: boolean
  molstarStructures?: unknown[]
  entities?: { entityId: string }[]
  mappedEntity?: { entityId: string; chains: string[] }
}
interface MolstarCell {
  transform: { ref: string; parent: string }
  obj?: { type: { name: string } }
  state: { isHidden?: boolean }
}
interface SessionView {
  type: string
  proteinLinkage?: { uniprotId: string }
  proteinLinkageCoordinates?: {
    maps: { transcriptSeqToStructureSeqPosition: Record<string, number> }
  }
  structures?: ProteinViewStructure[]
  superposedCount?: number
  menuItems?: () => { label?: string; onClick?: () => void }[]
  tracks?: { displays?: { featureIdUnderMouse?: string }[] }[]
  molstarPluginContext?: {
    helpers: {
      substructureParent: {
        get: (structure: unknown) => MolstarCell | undefined
      }
    }
    state: {
      data: {
        cells: Map<string, MolstarCell>
        tree: {
          children: {
            get: (ref: string) => {
              forEach: (fn: (ref: string) => void) => void
            }
          }
        }
      }
    }
    managers: {
      structure: {
        hierarchy: {
          current: {
            structures: {
              components: {
                representations: {
                  cell: {
                    transform: { params?: { colorTheme?: { name: string } } }
                  }
                }[]
              }[]
            }[]
          }
        }
      }
    }
  }
}
declare global {
  interface Window {
    JBrowseSession?: {
      views?: SessionView[]
      removeView?: (view: SessionView) => void
      hovered?: { hoverPosition?: { coord: number; refName: string } }
    }
    JBrowseRootModel?: { pluginManager?: { plugins?: { name: string }[] } }
  }
}

/**
 * Set up a local JBrowse instance for testing.
 * Assumes `jbrowse create .test-jbrowse-nightly` was already run by the pretest
 * script.
 */
export function setupJBrowse() {
  if (!fs.existsSync(TEST_JBROWSE_DIR)) {
    throw new Error(
      `JBrowse directory not found at ${TEST_JBROWSE_DIR}. ` +
        'Run: node scripts/ensure-nightly.mjs',
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
        esmUrl: `http://localhost:${JBROWSE_PORT}/plugin/jbrowse-plugin-protein3d.esm.js`,
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
          loc: 'chr1:114,704,469-114,716,894',
          assembly: 'hg38',
          tracks: [TRACK_ID],
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
        const actualPort = Number.parseInt(match[1]!, 10)
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
    // `killed` says a signal was sent, not that the process went away
    const exited = () => proc.exitCode !== null || proc.signalCode !== null
    if (exited()) {
      resolve()
      return
    }
    const escalate = setTimeout(() => {
      if (!exited()) {
        proc.kill('SIGKILL')
      }
      resolve()
    }, 5000)
    proc.on('close', () => {
      clearTimeout(escalate)
      resolve()
    })
    proc.kill('SIGTERM')
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

  // puppeteer types this `unknown`, and it is: reading `.message` off whatever
  // arrives would silently report `undefined` for a non-Error throw, in the one
  // handler that exists to catch the worst thing the page can do.
  page.on('pageerror', (err: unknown) => {
    complain(
      `[browser page error] ${err instanceof Error ? err.message : String(err)}`,
    )
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

// `data-display-drawn` is "something has been drawn"; `ready` alone is reachable
// before anything is drawn.
export const PAINTED_FEATURES =
  '[data-display-drawn="true"][data-display-phase="ready"]'

export async function waitForTrackLoad(page: Page): Promise<void> {
  await page.waitForSelector(PAINTED_FEATURES, { timeout: 60_000 })
}

async function readMenuItems(page: Page, timeout = 2000): Promise<string[]> {
  const deadline = Date.now() + timeout
  let items: string[] = []
  while (Date.now() < deadline && items.length === 0) {
    items = await page.$$eval('[role="menuitem"]', els =>
      els.map(el => el.textContent),
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
// Scrolled into view first, and measured after: once a protein view is open the
// genome view can sit above the fold, and every mouse move would land outside
// the window, reading as "the host has no features".
async function findFeature(page: Page) {
  const box = await page.$eval(TRACK_CONTAINER, el => {
    el.scrollIntoView({ block: 'center' })
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

// Hover the genome track until the structure answers, and report both ends of
// the round trip.
//
// The bridge this drives is pure host API and fails silently when it moves:
// `connectedHover` reads `session.hovered.hoverPosition.{coord, refName}`,
// where `coord` is pxToBp's 1-based display number, and looks the base up in
// the transcript's g2p map. A host that renames the field, or switches to the
// 0-based `coord0` sibling, returns undefined here — no throw, no console line,
// the residue simply stops lighting up. Nothing else in the suite touches it.
//
// Scanned rather than computed, because only coding bases are in g2p and the
// point is not to rediscover where the CDS is on screen. One pixel at a time,
// along a y the host itself reports a feature at: 570 coding bases in a 12 kb
// window is under 5% of the width, so the earlier coarse sweep missed the CDS
// entirely about one run in seven — a flaky test wearing the costume of a
// broken bridge.
export async function hoverGenomeUntilStructureResponds(page: Page): Promise<{
  genomeCoord: number
  refName: string
  structureSeqPos: number
  hoverGenomeLocus: string
}> {
  const { y } = await findFeature(page)
  const box = await page.$eval(TRACK_CONTAINER, el => {
    const { left, right } = el.getBoundingClientRect()
    return { left, right }
  })
  // Read both ends every time, so a miss can say which half was silent rather
  // than only that the pair never met.
  const read = () =>
    page.evaluate(() => {
      const session = window.JBrowseSession
      const structure = session?.views?.find(v => v.type === 'ProteinView')
        ?.structures?.[0]
      const mapping = structure?.genomeToTranscriptSeqMapping
      const pos = session?.hovered?.hoverPosition
      return {
        hovered: pos,
        structureHover: structure?.hoverPosition,
        locus: structure?.hoverGenomeLocus,
        mappingRefName: mapping?.refName,
        // whether the base under the pointer is coding at all, refName aside:
        // separates "never found the CDS" from "found it and nothing happened"
        coding:
          mapping && pos ? mapping.g2p[pos.coord - 1] !== undefined : false,
      }
    })

  let last
  let codingSeen = 0
  for (let x = Math.ceil(box.left); x < box.right; x++) {
    await page.mouse.move(x, y)
    last = await read()
    if (last.coding) {
      codingSeen++
    }
    if (
      last.structureHover?.source === 'genome' &&
      last.hovered &&
      last.locus
    ) {
      return {
        genomeCoord: last.hovered.coord,
        refName: last.hovered.refName,
        structureSeqPos: last.structureHover.structureSeqPos,
        hoverGenomeLocus: last.locus,
      }
    }
  }
  throw new Error(
    `hovering the track never reached the structure. codingBasesHovered=${codingSeen} y=${y} last=${JSON.stringify(last)}`,
  )
}

export async function clickTab(page: Page, label: string): Promise<void> {
  for (const tab of await page.$$('[role="tab"]')) {
    const text = await tab.evaluate(el => el.textContent)
    if (text.includes(label)) {
      await tab.click()
      return
    }
  }
  throw new Error(`no tab labelled "${label}"`)
}

export async function clickMenuItem(page: Page, label: string): Promise<void> {
  for (const item of await page.$$('[role="menuitem"]')) {
    const text = await item.evaluate(el => el.textContent)
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

// Launch can enable before the UniProt table's rows, accession links and status
// chips have painted, and a capture taken on the button alone shows an empty
// table.
export async function waitForUniProtTablePainted(page: Page): Promise<void> {
  await page.waitForFunction(
    dialog => {
      const rows = [...document.querySelectorAll(`${dialog} tbody tr`)]
      return (
        rows.length > 0 &&
        rows.every(
          row => row.querySelector('a') && row.querySelector('.MuiChip-root'),
        )
      )
    },
    { timeout: 30_000 },
    LAUNCH_DIALOG,
  )
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

// Whether the Mol* state cells of the labelled structure are hidden: each of
// its Mol* structures' root cell and everything built under it, read from the
// live state tree as structureVisibility.ts sets them.
export async function structureCellsHidden(
  page: Page,
  label: string,
): Promise<boolean[]> {
  return page.evaluate(label => {
    const view = window.JBrowseSession?.views?.find(
      v => v.type === 'ProteinView',
    )
    const plugin = view?.molstarPluginContext
    const structure = view?.structures?.find(s => s.label === label)
    if (!plugin || !structure) {
      return []
    }
    const { cells, tree } = plugin.state.data
    const hidden: boolean[] = []
    const walk = (ref: string) => {
      hidden.push(cells.get(ref)?.state.isHidden ?? false)
      tree.children.get(ref).forEach(walk)
    }
    for (const s of structure.molstarStructures ?? []) {
      let root = plugin.helpers.substructureParent.get(s)
      let parent = root && cells.get(root.transform.parent)
      while (root && parent?.obj?.type.name === 'Structure') {
        root = parent
        parent = cells.get(root.transform.parent)
      }
      if (root) {
        walk(root.transform.ref)
      }
    }
    return hidden
  }, label)
}

// Open a session spec on the test instance, the way a shared link does.
export async function openSessionSpec(page: Page, spec: object) {
  const url = `http://localhost:${JBROWSE_PORT}/?session=spec-${encodeURIComponent(JSON.stringify(spec))}`
  await page.goto(url, { waitUntil: 'domcontentloaded' })
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

// Mol* narrates a draw in a background-task toast over the canvas; a capture
// taken while it shows records the toast instead of the structure.
export async function waitForMolstarIdle(page: Page): Promise<void> {
  await page.waitForFunction(
    () => !document.querySelector('.msp-background-tasks')?.textContent,
    { timeout: 30_000, polling: 250 },
  )
  await new Promise(resolve => setTimeout(resolve, 500))
}
