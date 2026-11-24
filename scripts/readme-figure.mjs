// Renders the README's gallery from the local build on .test-jbrowse-nightly,
// one PNG per entry of `figures` under img/.
//
// Usage: node scripts/readme-figure.mjs [name]   (default: every figure)
//
// A file is rewritten only when the render differs beyond pngSnapshot's
// tolerance, so an unchanged figure leaves the tree clean. Exits non-zero
// without writing when a view does not finish loading or the page logs at warn
// or error beyond what browserConsole.mjs excuses.

import puppeteer from 'puppeteer'

import { collectPageComplaints } from './browserConsole.mjs'
import {
  PAINTED_FEATURES,
  ensureServer,
  sleep,
  specUrl,
  stopServer,
} from './localApp.mjs'
import { saveStableScreenshot } from './pngSnapshot.mjs'

const only = process.argv[2]

const tp53 = {
  assembly: 'hg38',
  loc: 'chr17:7,673,700-7,674,700',
  tracks: [
    { trackId: 'hg38-ncbiRefSeq', geneGlyphMode: 'longestCoding' },
    'clinvar_ncbi_hg38',
  ],
}

const figures = {
  // TP53 beside 1TUP, p53's core domain on DNA, with the R248 hotspot selected
  // on the structure and its codon banded on the gene.
  'tp53-1tup': {
    type: 'ProteinView',
    structures: [{ pdbId: '1TUP', initialResidues: { start: 248, end: 248 } }],
    transcriptId: 'NM_000546.6',
    color: { field: 'mappedChain' },
    connectedView: tp53,
  },
  // AlphaFold's model and the crystal structure superposed on one transcript.
  superposed: {
    type: 'ProteinView',
    structures: [{ uniprotId: 'P04637' }, { pdbId: '1TUP' }],
    transcriptId: 'NM_000546.6',
    connectedView: tp53,
  },
  // The structure colored by how many ClinVar records fall on each codon.
  clinvar: {
    type: 'ProteinView',
    structures: [{ pdbId: '1TUP' }],
    transcriptId: 'NM_000546.6',
    color: {
      field: 'track',
      trackId: 'clinvar_ncbi_hg38',
      stat: 'count',
      title: 'ClinVar records per residue',
    },
    connectedView: tp53,
  },
  // The 1D view: UniProt's features for P04637 aligned to the gene.
  features: {
    type: 'ProteinAnnotationView',
    uniprotId: 'P04637',
    transcriptId: 'NM_000546.6',
    connectedView: tp53,
  },
}

const names = Object.keys(figures).filter(n => !only || n === only)
if (names.length === 0) {
  throw new Error(`no figure named ${only}`)
}

async function render(browser, name) {
  const page = await browser.newPage()
  try {
    await page.setViewport({
      width: 1300,
      height: 720,
      deviceScaleFactor: 1.5,
    })
    const complaints = collectPageComplaints(page)
    const figure = figures[name]
    const spec = {
      views: [
        figure.type === 'ProteinView'
          ? { height: 600, sideBySide: true, zoomToBaseLevel: false, ...figure }
          : figure,
      ],
    }
    await page.goto(specUrl(spec), {
      waitUntil: 'networkidle2',
      timeout: 90_000,
    })
    if (figures[name].type === 'ProteinView') {
      await page.waitForSelector('[data-testid="protein-view-ready"]', {
        timeout: 120_000,
      })
    }
    await page.waitForSelector(PAINTED_FEATURES, { timeout: 60_000 })
    await sleep(6000)
    await page.addStyleTag({
      content: '.msp-background-tasks { display: none !important; }',
    })
    const said = complaints()
    if (said.length) {
      throw new Error(
        `${name}: the page complained: ${[...new Set(said)].join('; ')}`,
      )
    }
    saveStableScreenshot(await page.screenshot(), `img/${name}.png`)
  } finally {
    await page.close()
  }
}

let browser
try {
  await ensureServer()
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  for (const name of names) {
    await render(browser, name)
  }
} finally {
  await browser?.close()
  stopServer()
}
process.exit(0)
