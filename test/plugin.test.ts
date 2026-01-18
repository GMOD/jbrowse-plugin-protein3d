import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  cleanupJBrowse,
  createJBrowsePage,
  launchBrowser,
  setupJBrowse,
  startJBrowseServer,
  stopServer,
  waitForJBrowseLoad,
  waitForTrackLoad,
} from './setup'

import type { ChildProcess } from 'node:child_process'
import type { Browser, Page } from 'puppeteer'

describe('Protein3d Plugin E2E', () => {
  let server: ChildProcess | undefined
  let browser: Browser | undefined
  let page: Page | undefined
  const pluginErrors: string[] = []

  beforeAll(async () => {
    setupJBrowse()
    server = await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)

    // Listen for console errors related to plugin loading
    page.on('console', msg => {
      const text = msg.text()
      if (
        msg.type() === 'error' &&
        (text.includes('plugin') || text.includes('Plugin'))
      ) {
        pluginErrors.push(text)
      }
    })

    await waitForJBrowseLoad(page)
    await waitForTrackLoad(page)
  }, 180_000)

  afterAll(async () => {
    if (browser) {
      await browser.close()
    }
    if (server) {
      await stopServer(server)
    }
    await cleanupJBrowse()
  })

  it('should load JBrowse without errors', async () => {
    expect(page).toBeDefined()

    // Verify JBrowse loaded - check for root content
    const root = await page!.$('#root')
    expect(root).not.toBeNull()

    // Take a screenshot for debugging
    await page!.screenshot({ path: 'debug-jbrowse-loaded.png' })
  }, 30_000)

  it('should load the Protein3d plugin without errors', async () => {
    expect(page).toBeDefined()

    // Check that no plugin-related errors occurred
    if (pluginErrors.length > 0) {
      console.log('Plugin errors:', pluginErrors)
    }
    expect(pluginErrors).toHaveLength(0)

    // Check that the plugin is registered by looking for it in the session
    const pluginLoaded = await page!.evaluate(() => {
      // @ts-expect-error JBrowse global
      const session = window.__jbrowse_session
      if (session) {
        const plugins = session.jbrowse?.plugins || []
        return plugins.some(
          (p: { name: string }) =>
            p.name === 'Protein3d' || p.name === 'jbrowse-plugin-protein3d',
        )
      }
      // Fallback: check if the plugin script was loaded
      const scripts = Array.from(document.querySelectorAll('script'))
      return scripts.some(s => s.src?.includes('protein3d'))
    })

    console.log(`Plugin loaded: ${pluginLoaded}`)
    expect(pluginLoaded).toBe(true)
  }, 30_000)

  it('should render tracks without crashing', async () => {
    expect(page).toBeDefined()

    // Wait for canvas to be ready - this indicates tracks are rendering
    let canvas
    try {
      canvas = await page!.waitForSelector('canvas', { timeout: 30_000 })
    } catch {
      await page!.screenshot({ path: 'debug-no-canvas.png' })
      throw new Error('No canvas found - tracks may not be rendering')
    }

    expect(canvas).not.toBeNull()
    await page!.screenshot({ path: 'debug-tracks-rendered.png' })
  }, 60_000)
})
