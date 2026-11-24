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

const gene = (assembly, loc) => ({
  assembly,
  loc,
  tracks: [{ trackId: 'hg38-ncbiRefSeq', geneGlyphMode: 'longestCoding' }],
})

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
  // Sickle haemoglobin: Val6 of each beta chain drawn as spheres and named,
  // on the deoxy tetramer, beside HBB's codon 7.
  sickle: {
    type: 'ProteinView',
    structures: [{ pdbId: '2HBS' }],
    transcriptId: 'NM_000518.5',
    color: { field: 'mappedChain' },
    marks: [
      {
        site: 'B:6',
        mark: 'spheres',
        label: 'Val6',
        encoding: { color: { value: '#f28e2b' } },
      },
      {
        site: 'D:6',
        mark: 'spheres',
        encoding: { color: { value: '#f28e2b' } },
      },
    ],
    connectedView: gene('hg38', 'chr11:5,226,900-5,227,100'),
  },
  // KRAS G12C bound to sotorasib, with the three cancer hotspots named.
  kras: {
    type: 'ProteinView',
    structures: [{ pdbId: '6OIM' }],
    transcriptId: 'NM_004985.5',
    marks: [
      { site: 'A:12', label: 'G12' },
      { site: 'A:13', label: 'G13' },
      { site: 'A:61', label: 'Q61' },
    ].map(m => ({
      ...m,
      mark: 'spheres',
      encoding: { color: { value: '#f28e2b' } },
    })),
    connectedView: gene('hg38', 'chr12:25,245,270-25,245,400'),
  },
  // The 1D view: UniProt's features for KRAS aligned to the gene.
  features: {
    type: 'ProteinAnnotationView',
    uniprotId: 'P01116',
    transcriptId: 'NM_004985.5',
    connectedView: gene('hg38', 'chr12:25,225,000-25,250,000'),
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
      height: 960,
      deviceScaleFactor: 1.5,
    })
    const complaints = collectPageComplaints(page)
    const figure = figures[name]
    const spec = {
      views: [
        figure.type === 'ProteinView'
          ? { height: 800, sideBySide: true, zoomToBaseLevel: false, ...figure }
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
