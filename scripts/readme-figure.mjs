// Renders the README's figure from the local build on .test-jbrowse-nightly:
// TP53 beside 1TUP, p53's core domain on DNA, with the R248 hotspot selected
// on the structure and its codon banded on the gene.
//
// Usage: node scripts/readme-figure.mjs [out.png]   (default img/readme.png)
//
// The file is rewritten only when the render differs beyond pngSnapshot's
// tolerance, so an unchanged figure leaves the tree clean. Exits non-zero
// without writing when the view does not finish loading or the page errors.

import puppeteer from 'puppeteer'

import {
  PAINTED_FEATURES,
  ensureServer,
  sleep,
  specUrl,
  stopServer,
} from './localApp.mjs'
import { saveStableScreenshot } from './pngSnapshot.mjs'

const out = process.argv[2] ?? 'img/readme.png'

const spec = {
  views: [
    {
      type: 'ProteinView',
      structures: [
        { pdbId: '1TUP', initialResidues: { start: 248, end: 248 } },
      ],
      transcriptId: 'NM_000546.6',
      height: 640,
      sideBySide: true,
      zoomToBaseLevel: false,
      colorScheme: 'mapped-chain',
      connectedView: {
        assembly: 'hg38',
        loc: 'chr17:7,673,700-7,674,700',
        tracks: [
          { trackId: 'hg38-ncbiRefSeq', geneGlyphMode: 'longestCoding' },
          'clinvar_ncbi_hg38',
        ],
      },
    },
  ],
}

let browser
try {
  await ensureServer()
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 760, deviceScaleFactor: 1.5 })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(specUrl(spec), { waitUntil: 'networkidle2', timeout: 90_000 })
  await page.waitForSelector('[data-testid="protein-view-ready"]', {
    timeout: 120_000,
  })
  await page.waitForSelector(PAINTED_FEATURES, { timeout: 60_000 })
  await sleep(6000)
  await page.addStyleTag({
    content: '.msp-background-tasks { display: none !important; }',
  })
  if (errors.length) {
    throw new Error(`page errored: ${errors.join('; ')}`)
  }
  saveStableScreenshot(await page.screenshot(), out)
} finally {
  await browser?.close()
  stopServer()
}
process.exit(0)
