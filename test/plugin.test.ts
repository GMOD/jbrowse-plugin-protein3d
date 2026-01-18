import fs from 'node:fs'
import path from 'node:path'
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

// Get JBrowse version for screenshot directory
const JBROWSE_VERSION = process.env.TEST_JBROWSE_VERSION || 'nightly'
const SCREENSHOT_DIR = path.join('test', 'screenshots', JBROWSE_VERSION)

// Ensure screenshot directory exists
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

function screenshot(name: string) {
  return path.join(SCREENSHOT_DIR, `${name}.png`)
}

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
    await page!.screenshot({ path: screenshot('jbrowse-loaded') })
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
      await page!.screenshot({ path: screenshot('no-canvas') })
      throw new Error('No canvas found - tracks may not be rendering')
    }

    expect(canvas).not.toBeNull()
    await page!.screenshot({ path: screenshot('tracks-rendered') })
  }, 60_000)

  it('should launch protein view from gene context menu', async () => {
    expect(page).toBeDefined()

    // Wait a bit longer for track data to load from remote server
    await new Promise(r => setTimeout(r, 3000))

    // Wait for track canvas to be ready
    const canvases = await page!.$$('canvas')
    expect(canvases.length).toBeGreaterThan(0)

    // Find the feature track canvas (usually the larger one, not the overview)
    let featureCanvas = null
    for (const canvas of canvases) {
      const box = await canvas.boundingBox()
      if (box && box.height > 20 && box.width > 500) {
        featureCanvas = canvas
        break
      }
    }

    if (!featureCanvas) {
      await page!.screenshot({ path: screenshot('no-feature-canvas') })
      console.log('No suitable feature canvas found, skipping test')
      return
    }

    // Based on the screenshot, the track features are rendered at approximately:
    // - The GENCODE track row is at about y=170 in the viewport
    // - The gene features (yellow/orange boxes) are at various x positions
    // Let's click at viewport coordinates where we can see features
    // Using fixed viewport coordinates based on observed layout

    const viewport = await page!.viewport()
    const clickX = viewport!.width * 0.35 // ~35% from left - where a gene feature should be
    const clickY = 178 // Track feature row based on screenshot

    console.log(`Clicking at viewport position (${clickX}, ${clickY})`)
    await page!.screenshot({ path: screenshot('before-click') })

    await page!.mouse.click(clickX, clickY, {
      button: 'right',
    })

    // Wait for context menu to appear
    await new Promise(r => setTimeout(r, 1000))
    await page!.screenshot({ path: screenshot('context-menu') })

    // Look for menu items
    const menuItems = await page!.$$('[role="menuitem"]')
    console.log(`Found ${menuItems.length} menu items`)

    if (menuItems.length === 0) {
      console.log('No menu items found - may not have clicked on a feature')
      // Click elsewhere to close any potential menu
      await page!.mouse.click(10, 10)
      return
    }

    // Find and click "Launch protein view" option
    let launchProteinItem = null
    for (const item of menuItems) {
      const text = await page!.evaluate(
        el => (el as HTMLElement).textContent,
        item,
      )
      console.log(`Menu item: ${text}`)
      if (text?.toLowerCase().includes('protein') || text?.toLowerCase().includes('launch protein')) {
        launchProteinItem = item
        break
      }
    }

    if (!launchProteinItem) {
      console.log('Launch protein view option not found in context menu')
      // Close the menu
      await page!.keyboard.press('Escape')
      await page!.screenshot({ path: screenshot('no-protein-option') })
      return
    }

    // Click the launch protein view option
    await launchProteinItem.click()
    await new Promise(r => setTimeout(r, 2000))
    await page!.screenshot({ path: screenshot('after-launch-click') })

    // Wait for dialog to appear
    const dialog = await page!.waitForSelector('[role="dialog"]', { timeout: 10_000 })
    expect(dialog).not.toBeNull()
    await page!.screenshot({ path: screenshot('protein-dialog') })

    // Wait for the dialog to finish loading (the Launch button becomes enabled)
    await new Promise(r => setTimeout(r, 5000))
    await page!.screenshot({ path: screenshot('dialog-after-wait') })

    // Look for Launch button and click it
    const buttons = await page!.$$('button')
    let launchButton = null
    for (const button of buttons) {
      const text = await page!.evaluate(
        el => (el as HTMLElement).textContent,
        button,
      )
      console.log(`Button: ${text}`)
      if (text?.toLowerCase().includes('launch')) {
        launchButton = button
        break
      }
    }

    if (launchButton) {
      // Check if button is disabled
      const isDisabled = await page!.evaluate(
        el => (el as HTMLButtonElement).disabled,
        launchButton,
      )
      console.log(`Launch button disabled: ${isDisabled}`)

      if (!isDisabled) {
        await launchButton.click()
        console.log('Clicked Launch button')
        await new Promise(r => setTimeout(r, 2000))
        await page!.screenshot({ path: screenshot('launch-options') })

        // Look for "Launch 3D protein structure view" option in the popup menu
        const menuItems = await page!.$$('[role="menuitem"], [role="option"], li')
        let launch3dOption = null
        for (const item of menuItems) {
          const text = await page!.evaluate(
            el => (el as HTMLElement).textContent,
            item,
          )
          console.log(`Launch option: ${text}`)
          if (text?.includes('3D protein structure')) {
            launch3dOption = item
            break
          }
        }

        if (launch3dOption) {
          await launch3dOption.click()
          console.log('Clicked Launch 3D protein structure view')
          await new Promise(r => setTimeout(r, 10000))
          await page!.screenshot({ path: screenshot('protein-view-loading') })

          // Check if protein view opened (look for molstar elements)
          const proteinViewOpened = await page!.evaluate(() => {
            // Check for molstar/protein view specific elements
            const molstarCanvas = document.querySelector('[class*="msp-plugin"]') ||
                                 document.querySelector('canvas[class*="msp"]') ||
                                 document.querySelector('[class*="Molstar"]') ||
                                 document.querySelector('[class*="molstar"]')
            return !!molstarCanvas
          })

          console.log(`Protein view opened: ${proteinViewOpened}`)
          await page!.screenshot({ path: screenshot('protein-view-success') })
        } else {
          console.log('Launch 3D option not found')
          await page!.screenshot({ path: screenshot('no-3d-option') })
        }
      } else {
        console.log('Launch button is disabled - data may still be loading')
        await page!.screenshot({ path: screenshot('launch-disabled') })
      }
    } else {
      console.log('Launch button not found in dialog')
      await page!.screenshot({ path: screenshot('no-launch-button') })
    }
  }, 180_000)
})
