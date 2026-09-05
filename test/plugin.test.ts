import path from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import {
  LAUNCH_DIALOG,
  PAINTED_FEATURES,
  TRACK_ID,
  captureScreenshot,
  cleanupJBrowse,
  clickLaunch,
  clickMenuItem,
  createJBrowsePage,
  flushScreenshots,
  getProteinViewState,
  launchBrowser,
  openFeatureContextMenu,
  openSessionSpec,
  pageErrors,
  setupJBrowse,
  startJBrowseServer,
  stopServer,
  waitForJBrowseLoad,
  waitForLaunchEnabled,
  waitForStructureRendered,
  waitForTrackLoad,
} from './setup'

import type { ChildProcess } from 'node:child_process'
import type { Browser, Page } from 'puppeteer'

const JBROWSE_VERSION = process.env.TEST_JBROWSE_VERSION || 'nightly'
const SCREENSHOT_DIR = path.join('test-screenshots', JBROWSE_VERSION)
// A failing run's captures show a broken app, so they go here instead of over
// the committed references. Gitignored; CI uploads the whole tree as artifacts.
const FAILED_SCREENSHOT_DIR = path.join(
  'test-screenshots',
  'failed',
  JBROWSE_VERSION,
)

function screenshot(name: string) {
  return path.join(SCREENSHOT_DIR, `${name}.png`)
}

// The locus lands on NRAS, whose AlphaFold structure (P01111) is 189 residues.
// How much transcript arrives with the clicked feature is host dependent: v3
// hands the menu the gene and the plugin picks the transcript itself, keeping
// all four CDS records, while v4 hands over a transcript that has been reduced
// to one CDS. So the transcript length is asserted for consistency with the
// mapping rather than pinned to a number.
const STRUCTURE_RESIDUES = 189

describe('Protein3d Plugin E2E', () => {
  let server: ChildProcess | undefined
  let browser: Browser | undefined
  let page: Page
  let failed = false

  beforeAll(async () => {
    setupJBrowse()
    server = await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    try {
      await waitForJBrowseLoad(page)
      await waitForTrackLoad(page)
    } catch (error) {
      // A bundle that throws while loading error-pages the app, and every test
      // below is skipped — leave a picture of what the page looked like.
      failed = true
      await captureScreenshot(page, screenshot('00-load-failure'))
      throw error
    }
  }, 180_000)

  afterEach(ctx => {
    if (ctx.task.result?.state === 'fail') {
      failed = true
    }
  })

  afterAll(async () => {
    flushScreenshots(failed ? FAILED_SCREENSHOT_DIR : undefined)
    if (browser) {
      await browser.close()
    }
    if (server) {
      await stopServer(server)
    }
    await cleanupJBrowse()
  })

  it('evaluates the plugin bundle without error-paging the app', async () => {
    // The umd bundle only defines its global if it finished evaluating; a throw
    // during load or configure() takes the whole app to its error page.
    expect(
      await page.evaluate(() => typeof window.JBrowsePluginProtein3d),
    ).toBe('object')
    expect(pageErrors).toEqual([])
    await captureScreenshot(page, screenshot('01-jbrowse-loaded'))
  }, 30_000)

  it('renders gene features on the track', async () => {
    const painted = await page.$$(PAINTED_FEATURES)
    expect(painted.length).toBeGreaterThan(0)
    await captureScreenshot(page, screenshot('02-tracks-rendered'))
  }, 60_000)

  it('contributes Launch protein view to the feature context menu', async () => {
    const items = await openFeatureContextMenu(page)
    console.log(`context menu: ${items.join(' | ')}`)
    expect(items).toContain('Launch protein view')
    // The host's own rows, asserted alongside ours because the plugin extends
    // the display's contextMenuItems and a throw in there costs the user the
    // whole menu. Checking only for our row would read that as a missing
    // feature, and the wipeout is the worse outcome of the two.
    expect(items).toContain('Open feature details')
    await captureScreenshot(page, screenshot('03-context-menu'))
  }, 60_000)

  it('launches a protein view with the structure aligned and rendered', async () => {
    await clickMenuItem(page, 'Launch protein view')
    await page.waitForSelector(LAUNCH_DIALOG, { timeout: 30_000 })
    await captureScreenshot(page, screenshot('04-protein-dialog'))

    await waitForLaunchEnabled(page)
    await captureScreenshot(page, screenshot('05-dialog-ready'))
    await clickLaunch(page)

    const ink = await waitForStructureRendered(page)
    console.log(`molstar canvas ink: ${(ink * 100).toFixed(1)}%`)
    await captureScreenshot(page, screenshot('06-protein-view'))

    const state = await getProteinViewState(page)
    console.log(`protein view state: ${JSON.stringify(state)}`)
    expect(state.structureCount).toBe(1)
    expect(state.structureSeqLength).toBe(STRUCTURE_RESIDUES)
    expect(state.transcriptName).toMatch(/^ENST\d+/)
    expect(state.hasAlignment).toBe(true)
    // every codon of the translated transcript maps onto the genome
    expect(state.mappedGenomePositions).toBe(state.transcriptLength * 3)
    expect(state.transcriptLength).toBeGreaterThan(0)
    expect(pageErrors).toEqual([])
  }, 240_000)

  // The declarative multi-structure launch: an AlphaFold model, the p53 core
  // bound to DNA (1TUP, three protein copies as one entity beside two DNA
  // entities) and the p53 peptide on MDM2 (1YCR, where the transcript's chain
  // is the short one). Every structure has to map to the transcript, and the
  // chain choice has to land on the p53 entity of each complex.
  it('opens several structures from one spec, each mapped to the right chain', async () => {
    await openSessionSpec(page, {
      views: [
        {
          type: 'ProteinView',
          structures: [
            { uniprotId: 'P04637' },
            // R248 by the authors' numbering; the construct starts at 94, so
            // this has to resolve to position 154 without the spec saying so
            { pdbId: '1TUP', initialResidues: { start: 248, end: 248 } },
            { pdbId: '1YCR' },
          ],
          transcriptId: 'ENST00000269305.9',
          connectedView: {
            assembly: 'hg38',
            loc: 'chr17:7,668,421-7,687,550',
            tracks: [TRACK_ID],
          },
        },
      ],
    })
    // the spec's own genome view has a generated id, so the fixture's track
    // container is not what to wait for; the protein view's ready flag flips
    // once every structure has loaded and aligned
    await page.waitForSelector('[data-testid="protein-view-ready"]', {
      timeout: 180_000,
    })
    await waitForStructureRendered(page)
    await page.waitForFunction(
      () =>
        window.JBrowseSession?.views
          ?.find(v => v.type === 'ProteinView')
          ?.structures?.every(s => s.pairwiseAlignment) ?? false,
      { timeout: 120_000 },
    )
    await captureScreenshot(page, screenshot('07-multi-structure'))

    const state = await getProteinViewState(page)
    console.log(`multi-structure state: ${JSON.stringify(state.structures)}`)
    expect(state.structures.map(s => s.hasAlignment)).toEqual([
      true,
      true,
      true,
    ])
    expect(state.structures[1]?.mappedEntityId).toBe('3')
    expect(state.structures[2]?.mappedEntityId).toBe('2')

    // The author-numbered seed resolved on the real file: 1TUP's chain is
    // numbered from 94, so R248 is position 154, and the ruler says 248.
    const hotspot = await page.evaluate(() => {
      const s = window.JBrowseSession!.views!.find(
        v => v.type === 'ProteinView',
      )!.structures![1]!
      const panel = document.querySelector('[data-structure="1TUP"]')!
      panel.scrollIntoView()
      return {
        clickedStructureRange: s.clickedStructureRange,
        residueNumber: s.residueNumber?.(154),
        rulerLabels: [...panel.querySelectorAll('span')]
          .map(el => el.textContent)
          .filter(t => /^\d+$/.test(t ?? '')),
      }
    })
    console.log(`hotspot: ${JSON.stringify(hotspot)}`)
    expect(hotspot.clickedStructureRange).toEqual({ start: 154, end: 155 })
    expect(hotspot.residueNumber).toBe(248)
    expect(hotspot.rulerLabels).toContain('250')
    await captureScreenshot(page, screenshot('08-hotspot-panel'))
    expect(pageErrors).toEqual([])
  }, 300_000)
})
