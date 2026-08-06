import path from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import {
  LAUNCH_DIALOG,
  PAINTED_FEATURES,
  captureScreenshot,
  cleanupJBrowse,
  clickLaunch,
  clickMenuItem,
  createJBrowsePage,
  flushScreenshots,
  getProteinViewState,
  launchBrowser,
  openFeatureContextMenu,
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
})
