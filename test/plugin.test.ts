import path from 'node:path'

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import {
  LAUNCH_DIALOG,
  MOLSTAR_CANVAS,
  PAINTED_FEATURES,
  TRACK_ID,
  captureScreenshot,
  cleanupJBrowse,
  clickLaunch,
  clickMenuItem,
  clickTab,
  createJBrowsePage,
  flushScreenshots,
  getProteinViewState,
  hoverGenomeUntilStructureResponds,
  launchBrowser,
  openFeatureContextMenu,
  openSessionSpec,
  pageComplaintsSince,
  setupJBrowse,
  startJBrowseServer,
  stopServer,
  structureCellsHidden,
  waitForJBrowseLoad,
  waitForLaunchEnabled,
  waitForMolstarIdle,
  waitForStructureRendered,
  waitForTrackLoad,
  waitForUniProtTablePainted,
} from './setup'

import type { ChildProcess } from 'node:child_process'
import type { Browser, Page } from 'puppeteer'

const SCREENSHOT_DIR = path.join('test-screenshots', 'nightly')
// A failing run's captures show a broken app, so they go here instead of over
// the committed references. Gitignored; CI uploads the whole tree as artifacts.
const FAILED_SCREENSHOT_DIR = path.join('test-screenshots', 'failed', 'nightly')

function screenshot(name: string) {
  return path.join(SCREENSHOT_DIR, `${name}.png`)
}

// The locus lands on NRAS, whose AlphaFold structure (P01111) is 189 residues.
const STRUCTURE_RESIDUES = 189

function allHidden(hidden: boolean[]) {
  return hidden.length > 1 && hidden.every(Boolean)
}

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
    // The plugin is only registered if its module finished evaluating; a throw
    // during load or configure() takes the whole app to its error page.
    expect(
      await page.evaluate(() =>
        window.JBrowseRootModel?.pluginManager?.plugins?.some(
          p => p.name === 'ProteinViewer',
        ),
      ),
    ).toBe(true)
    expect(pageComplaintsSince()).toEqual([])
    await captureScreenshot(page, screenshot('01-jbrowse-loaded'))
  }, 30_000)

  it('renders gene features on the track', async () => {
    const painted = await page.$$(PAINTED_FEATURES)
    expect(painted.length).toBeGreaterThan(0)
    expect(pageComplaintsSince()).toEqual([])
    await captureScreenshot(page, screenshot('02-tracks-rendered'))
  }, 60_000)

  it('contributes Launch protein view to the feature context menu', async () => {
    const items = await openFeatureContextMenu(page)
    expect(items).toContain('Launch protein view')
    // The host's own rows, asserted alongside ours because the plugin extends
    // the display's contextMenuItems and a throw in there costs the user the
    // whole menu. Checking only for our row would read that as a missing
    // feature, and the wipeout is the worse outcome of the two.
    expect(items).toContain('Open feature details')
    expect(pageComplaintsSince()).toEqual([])
    await captureScreenshot(page, screenshot('03-context-menu'))
  }, 60_000)

  it('launches a protein view with the structure aligned and rendered', async () => {
    await clickMenuItem(page, 'Launch protein view')
    await page.waitForSelector(LAUNCH_DIALOG, { timeout: 30_000 })
    await captureScreenshot(page, screenshot('04-protein-dialog'))

    await waitForLaunchEnabled(page)
    await waitForUniProtTablePainted(page)
    await captureScreenshot(page, screenshot('05-dialog-ready'))
    await clickLaunch(page)

    await waitForStructureRendered(page)
    await captureScreenshot(page, screenshot('06-protein-view'))

    const state = await getProteinViewState(page)
    expect(state.structureCount).toBe(1)
    expect(state.structureSeqLength).toBe(STRUCTURE_RESIDUES)
    expect(state.transcriptName).toMatch(/^ENST\d+/)
    expect(state.hasAlignment).toBe(true)
    // every codon of the translated transcript maps onto the genome
    expect(state.mappedGenomePositions).toBe(state.transcriptLength * 3)
    expect(state.transcriptLength).toBeGreaterThan(0)
    expect(pageComplaintsSince()).toEqual([])
  }, 240_000)

  // The plugin's reason to exist, and until now tested on no host at all: a
  // pointer on the genome lighting the residue it codes for. Both halves run
  // over host API that fails silently — `session.hovered.hoverPosition` going
  // in, the codon span coming back out — so a rename or a change of coordinate
  // base stops the feature working without throwing anything.
  //
  // Asserted as a round trip rather than against a fixed coordinate: the codon
  // the structure maps back to has to contain the base the pointer is on. In
  // goes g2p, out comes p2gCodon, so agreeing means the two are inverses on
  // real data rather than in a stub.
  it('maps a genome hover onto the residue, and that residue back onto the codon', async () => {
    const hover = await hoverGenomeUntilStructureResponds(page)
    expect(hover.structureSeqPos).toBeGreaterThanOrEqual(0)

    const locus = /^(.+):(\d+)-(\d+)$/.exec(hover.hoverGenomeLocus)
    expect(locus).not.toBeNull()
    const [, refName, start, end] = locus!
    // Deliberately not compared to hover.refName. The two name the chromosome
    // differently on purpose — the view reports the assembly's canonical `1`,
    // the locus the feature's `chr1` out of the GFF — and both consumers of
    // this string resolve aliases. That mismatch is exactly what the hover
    // bridge itself got wrong, so the coordinates are what is asserted.
    expect(refName).toBeTruthy()
    // a locString is inclusive 1-based at both ends, and the hovered base is
    // pxToBp's 1-based `coord`, so a codon spans exactly three
    expect(Number(end) - Number(start)).toBe(2)
    expect(hover.genomeCoord).toBeGreaterThanOrEqual(Number(start))
    expect(hover.genomeCoord).toBeLessThanOrEqual(Number(end))
    expect(pageComplaintsSince()).toEqual([])
  }, 120_000)

  // The dialog's defaults with no dialog: one click from the gene to a linked
  // structure, which is the whole point of the item.
  it('opens the AlphaFold structure in one click', async () => {
    await page.evaluate(() => {
      const session = window.JBrowseSession!
      for (const view of session.views!.filter(v => v.type === 'ProteinView')) {
        session.removeView!(view)
      }
    })
    const items = await openFeatureContextMenu(page)
    expect(items).toContain('Open AlphaFold structure')
    await clickMenuItem(page, 'Open AlphaFold structure')
    await waitForStructureRendered(page)

    expect(await page.$(LAUNCH_DIALOG)).toBeNull()
    const state = await getProteinViewState(page)
    expect(state.structureCount).toBe(1)
    expect(state.structureSeqLength).toBe(STRUCTURE_RESIDUES)
    expect(state.hasAlignment).toBe(true)
    expect(state.mappedGenomePositions).toBe(state.transcriptLength * 3)
    expect(pageComplaintsSince()).toEqual([])
  }, 240_000)

  // The 1D view aligns its transcript to the UniProt entry when it attaches,
  // through three things no unit test reaches: the plugin's afterAttach
  // running beside the genome view's own, the entry's sequence read back out
  // of the temporary assembly, and the transcript translated from a feature
  // stored on the view. NRAS's transcript is the entry, so the map is the
  // identity; another isoform's offset is pinned in linkage.test.ts.
  it('aligns a 1D protein view to its UniProt entry on the host', async () => {
    await page.evaluate(() => {
      const session = window.JBrowseSession!
      for (const view of session.views!.filter(v => v.type === 'ProteinView')) {
        session.removeView!(view)
      }
    })
    await openFeatureContextMenu(page)
    await clickMenuItem(page, 'Launch protein view')
    await page.waitForSelector(LAUNCH_DIALOG, { timeout: 30_000 })
    await waitForLaunchEnabled(page)
    await page.click(
      '[role="tabpanel"]:not([hidden]) [data-testid="protein-launch-options-button"]',
    )
    await page.click('[data-testid="protein-launch-option-1d"]')

    const linked = await page.waitForFunction(
      () => {
        const view = window.JBrowseSession?.views?.find(v => v.proteinLinkage)
        const map =
          view?.proteinLinkageCoordinates?.maps
            .transcriptSeqToStructureSeqPosition
        return view?.proteinLinkage && map
          ? {
              uniprotId: view.proteinLinkage.uniprotId,
              residues: Object.keys(map).length,
              first: map[0],
              last: map[188],
            }
          : false
      },
      { timeout: 90_000 },
    )
    expect(await linked.jsonValue()).toEqual({
      uniprotId: 'P01111',
      residues: STRUCTURE_RESIDUES,
      first: 0,
      last: 188,
    })
    // The launch opens the AlphaMissense track last, and each track's config
    // rides on the view under an id the view prefixes
    const opened = await page.waitForFunction(
      () => {
        const view = window.JBrowseSession?.views?.find(v => v.proteinLinkage)
        const trackIds =
          view?.tracks?.map(t => t.configuration?.trackId ?? '') ?? []
        return view && trackIds.some(id => id.endsWith('-AlphaMissense-scores'))
          ? { viewId: view.id, trackIds }
          : false
      },
      { timeout: 90_000 },
    )
    const launched = await opened.jsonValue()
    if (!launched) {
      throw new Error('the 1D view opened no tracks')
    }
    const { viewId, trackIds } = launched
    const prefix = `${viewId}-P01111-`
    expect(trackIds.filter(id => !id.startsWith(prefix))).toEqual([])
    const names = trackIds.map(id => id.slice(prefix.length))
    expect(names).toEqual(
      expect.arrayContaining(['Chain', 'Antigen', 'Variation']),
    )
    expect(new Set(trackIds).size).toBe(trackIds.length)

    // Seventeen tracks are still fetching and drawing when the last one
    // opens, and whatever they say belongs to this leg.
    await page.waitForNetworkIdle({ idleTime: 2000, timeout: 120_000 })
    expect(pageComplaintsSince()).toEqual([])
    // The view stays open. Closing it, even idle, makes the host warn once per
    // display that it "is no longer part of a state tree" (jbrowse nightly
    // 5.0.0-beta.11, 2026-10-08): the track's config now dies with it, and
    // something in the display still reads `configuration` afterwards. The
    // gene track the later legs look for is the first on the page either way.
  }, 300_000)

  // The PDB search tab: PDBe's SIFTS listing for the resolved UniProt entry,
  // the first row preselected, launched against the RCSB file. NRAS has
  // dozens of crystals, every one a fragment with partners, so the alignment
  // and the chain choice both have to come out of the load.
  it('launches an experimental structure from the PDB search tab', async () => {
    await page.evaluate(() => {
      const session = window.JBrowseSession!
      for (const view of session.views!.filter(v => v.type === 'ProteinView')) {
        session.removeView!(view)
      }
    })
    await openFeatureContextMenu(page)
    await clickMenuItem(page, 'Launch protein view')
    await page.waitForSelector(LAUNCH_DIALOG, { timeout: 30_000 })
    await clickTab(page, 'PDB search')
    await page.waitForSelector('[data-testid="pdb-results-table"] tbody tr', {
      timeout: 90_000,
    })
    await captureScreenshot(page, screenshot('09-pdb-search-tab'))
    await waitForLaunchEnabled(page)
    await clickLaunch(page)

    await waitForStructureRendered(page)
    await page.waitForFunction(
      () =>
        window.JBrowseSession?.views
          ?.find(v => v.type === 'ProteinView')
          ?.structures?.every(s => s.pairwiseAlignment) ?? false,
      { timeout: 120_000 },
    )
    await captureScreenshot(page, screenshot('10-pdb-protein-view'))

    const state = await getProteinViewState(page)
    expect(state.structureCount).toBe(1)
    expect(state.structures[0]?.url).toMatch(/files\.rcsb\.org/)
    expect(state.hasAlignment).toBe(true)
    expect(state.structures[0]?.mappedEntityId).toBeDefined()
    expect(pageComplaintsSince()).toEqual([])
  }, 300_000)

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
            // two stretches of the MDM2-bound p53 peptide, residues 15-29
            {
              pdbId: '1YCR',
              initialTranscriptResidues: [
                { start: 17, end: 19 },
                { start: 22, end: 24 },
              ],
            },
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
        clickedStructureRanges: s.clickedStructureRanges,
        residueNumber: s.residueNumber?.(154),
        rulerLabels: [...panel.querySelectorAll('span')]
          .map(el => el.textContent)
          .filter(t => /^\d+$/.test(t)),
      }
    })
    expect(hotspot.clickedStructureRanges).toEqual([{ start: 154, end: 155 }])
    expect(hotspot.residueNumber).toBe(248)
    expect(hotspot.rulerLabels).toContain('250')
    await captureScreenshot(page, screenshot('08-hotspot-panel'))

    const peptideRuns = await page.evaluate(
      () =>
        window.JBrowseSession!.views!.find(v => v.type === 'ProteinView')!
          .structures![2]!.clickedStructureRanges,
    )
    expect(peptideRuns?.map(r => r.end - r.start)).toEqual([3, 3])

    // Hiding a structure hides every Mol* cell under it, a Re-align
    // superposes all three again from scratch, and the hidden one stays hidden
    // through it
    const superposed = () =>
      page.evaluate(
        () =>
          window.JBrowseSession!.views!.find(v => v.type === 'ProteinView')!
            .superposedCount,
      )
    await expect.poll(superposed, { timeout: 120_000 }).toBe(3)
    await page.click('button[aria-label="Hide 1TUP"]')
    await expect
      .poll(() => structureCellsHidden(page, '1TUP'), { timeout: 30_000 })
      .toSatisfy(allHidden)
    expect(await structureCellsHidden(page, 'P04637')).not.toContain(true)

    const resetTo = await page.evaluate(() => {
      const view = window.JBrowseSession!.views!.find(
        v => v.type === 'ProteinView',
      )!
      view.menuItems!().find(
        item => item.label === 'Re-align structures (TM-align)',
      )!.onClick!()
      return view.superposedCount
    })
    expect(resetTo).toBe(0)
    await expect.poll(superposed, { timeout: 120_000 }).toBe(3)
    expect(await structureCellsHidden(page, '1TUP')).toSatisfy(allHidden)
    await waitForMolstarIdle(page)
    await captureScreenshot(page, screenshot('11-structure-hidden'))

    await page.click('button[aria-label="Show 1TUP"]')
    await expect
      .poll(() => structureCellsHidden(page, '1TUP'), { timeout: 30_000 })
      .toSatisfy(
        (hidden: boolean[]) => hidden.length > 1 && !hidden.includes(true),
      )

    expect(pageComplaintsSince()).toEqual([])
  }, 400_000)

  // A declared selection is the user's to put down like a clicked one. This
  // leg is what shows Mol* reports a click on empty canvas at all; the unit
  // tests take that as given.
  it('puts a declared selection down on a click on empty canvas', async () => {
    await openSessionSpec(page, {
      views: [
        {
          type: 'ProteinView',
          structures: [
            { pdbId: '1TUP', initialResidues: { start: 248, end: 248 } },
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
    await page.waitForSelector('[data-testid="protein-view-ready"]', {
      timeout: 180_000,
    })
    await waitForStructureRendered(page)
    const ranges = () =>
      page.evaluate(() =>
        window
          .JBrowseSession!.views!.find(v => v.type === 'ProteinView')!
          .structures!.map(s => s.clickedStructureRanges),
      )
    await page.waitForFunction(
      () =>
        window
          .JBrowseSession!.views!.find(v => v.type === 'ProteinView')!
          .structures!.every(s => s.clickedStructureRanges?.length),
      { timeout: 60_000 },
    )
    expect(await ranges()).toEqual([[{ start: 154, end: 155 }]])
    const canvas = (await page.$(MOLSTAR_CANVAS))!
    const box = (await canvas.boundingBox())!
    await canvas.click({ offset: { x: 5, y: box.height / 2 } })
    await new Promise(resolve => setTimeout(resolve, 1000))
    expect(await ranges()).toEqual([[]])
    expect(pageComplaintsSince()).toEqual([])
  }, 300_000)

  // An NMR entry loads as one Mol* structure per model, and the colour scheme
  // used to reach only the first: on 1D3Z's ten models the other nine kept
  // their per-model colours, as if the scheme had not applied.
  it('colours every model of an NMR ensemble', async () => {
    await openSessionSpec(page, {
      views: [
        {
          type: 'ProteinView',
          structures: [{ pdbId: '1D3Z' }],
          colorScheme: 'hydrophobicity',
        },
      ],
    })
    await page.waitForSelector('[data-testid="protein-view-ready"]', {
      timeout: 180_000,
    })
    await waitForStructureRendered(page)
    const themes = () =>
      page.evaluate(
        () =>
          window.JBrowseSession?.views
            ?.find(v => v.type === 'ProteinView')
            ?.molstarPluginContext?.managers.structure.hierarchy.current.structures.flatMap(
              s =>
                s.components.flatMap(c =>
                  c.representations.map(
                    r => r.cell.transform.params?.colorTheme?.name,
                  ),
                ),
            ) ?? [],
      )
    await expect
      .poll(themes, { timeout: 30_000 })
      .toSatisfy(
        (names: (string | undefined)[]) =>
          names.length >= 10 && names.every(n => n === 'kyte-doolittle'),
      )
    await captureScreenshot(page, screenshot('09-nmr-ensemble'))
    expect(pageComplaintsSince()).toEqual([])
  }, 300_000)

  // The figure the protein browser's BRAF demo leans on: AlphaMissense on
  // the AlphaFold model, every residue placed, V600 among the darkest red.
  // ClinVar after it on the same model, whose zeros on every uncalled residue
  // would hide a parse that stopped finding pathogenic calls.
  it('colours an AlphaFold model by AlphaMissense, then by ClinVar', async () => {
    await openSessionSpec(page, {
      views: [
        {
          type: 'ProteinView',
          structures: [{ uniprotId: 'P15056' }],
          colorScheme: 'alphamissense',
        },
      ],
    })
    await page.waitForSelector('[data-testid="protein-view-ready"]', {
      timeout: 180_000,
    })
    await waitForStructureRendered(page)
    const placed = () =>
      page.evaluate(() => {
        const s = window.JBrowseSession!.views!.find(
          v => v.type === 'ProteinView',
        )!.structures![0]!
        const values = s.placedVariantEffects?.byLabelSeqId
        return {
          pending: s.variantEffectsPending,
          count: values?.size ?? 0,
          nonZero: [...(values?.values() ?? [])].filter(v => v > 0).length,
          v600: values?.get(600),
          k601: values?.get(601),
          status: s.statusMessage,
        }
      })
    await expect
      .poll(async () => (await placed()).pending, { timeout: 60_000 })
      .toBe(false)
    const alphaMissense = await placed()
    expect(alphaMissense.count).toBeGreaterThanOrEqual(760)
    expect(alphaMissense.v600).toBeGreaterThan(0.9)
    expect(alphaMissense.status).toBeUndefined()
    const themes = () =>
      page.evaluate(
        () =>
          window.JBrowseSession?.views
            ?.find(v => v.type === 'ProteinView')
            ?.molstarPluginContext?.managers.structure.hierarchy.current.structures.flatMap(
              s =>
                s.components.flatMap(c =>
                  c.representations.map(
                    r => r.cell.transform.params?.colorTheme?.name,
                  ),
                ),
            ) ?? [],
      )
    await expect
      .poll(themes, { timeout: 30_000 })
      .toSatisfy(
        (names: (string | undefined)[]) =>
          names.length > 0 && names.every(n => n === 'alphamissense'),
      )
    await waitForMolstarIdle(page)
    await captureScreenshot(page, screenshot('13-alphamissense'))

    await page.evaluate(() => {
      window.JBrowseSession!.views!.find(v => v.type === 'ProteinView')!
        .setColorScheme!('clinvar')
    })
    await expect
      .poll(async () => (await placed()).pending, { timeout: 90_000 })
      .toBe(false)
    const clinVar = await placed()
    expect(clinVar.status).toBeUndefined()
    expect(clinVar.count).toBeGreaterThanOrEqual(760)
    expect(clinVar.nonZero).toBeGreaterThanOrEqual(40)
    expect(clinVar.k601).toBeGreaterThanOrEqual(1)
    await expect
      .poll(themes, { timeout: 30_000 })
      .toSatisfy(
        (names: (string | undefined)[]) =>
          names.length > 0 && names.every(n => n === 'clinvar'),
      )
    expect(pageComplaintsSince()).toEqual([])
  }, 300_000)

  // With no transcript there is nothing to align, so the structure reads
  // hovers from its first protein chain and lets the user pick another. On
  // 1TUP the first two entities are DNA strands.
  it('opens a structure without a transcript on its protein chain, with a chain picker', async () => {
    await openSessionSpec(page, {
      views: [{ type: 'ProteinView', structures: [{ pdbId: '1TUP' }] }],
    })
    await page.waitForSelector('[data-testid="protein-view-ready"]', {
      timeout: 180_000,
    })
    await waitForStructureRendered(page)
    const mapped = () =>
      page.evaluate(() => {
        const s = window.JBrowseSession!.views!.find(
          v => v.type === 'ProteinView',
        )!.structures![0]!
        return {
          entities: s.entities?.map(e => e.entityId),
          mappedEntity: s.mappedEntity?.entityId,
        }
      })
    expect(await mapped()).toEqual({
      entities: ['1', '2', '3'],
      mappedEntity: '3',
    })

    await page.click('[data-testid="protein-mapped-chain"] [role="combobox"]')
    const options = await page.$$('[role="listbox"] [role="option"]')
    expect(options).toHaveLength(3)
    await waitForMolstarIdle(page)
    await captureScreenshot(page, screenshot('12-standalone-chain-picker'))
    await options[0]!.click()
    await expect
      .poll(async () => (await mapped()).mappedEntity, { timeout: 10_000 })
      .toBe('1')
    expect(pageComplaintsSince()).toEqual([])
  }, 300_000)
})
