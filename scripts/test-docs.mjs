// Smoke-tests the session-spec examples documented in DEVELOPERS.md against a
// real browser, so the docs can't silently rot (e.g. an AlphaFold URL version
// bump, or a regression in the connectedView launch wiring).
//
// It loads three specs through the local dev app:
//   1. standalone ProteinView (structure streams + sequence extracted)
//   2. connected ProteinView + LinearGenomeView via the `connectedView` param
//      (genome<->protein mapping built, structure aligned, genome tracks render)
//   3. short form: uniprotId + transcriptId derive url/feature/sequence from
//      the connected track (no explicit url/feature/userProvidedTranscriptSeq)
//
// Usage:
//   pnpm test:docs                 # auto-starts `pnpm start` if :9000 is down
//   pnpm start & pnpm test:docs    # reuse an already-running dev server
//
// Exits non-zero on the first failed assertion. Writes a screenshot of the
// connected view to test-screenshots/docs-connected.png on success.

import puppeteer from 'puppeteer'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'

const PORT = 9000
const BASE = `http://localhost:${PORT}`
const APP = `${BASE}/.test-jbrowse-nightly/?config=/config.json`

// --- DEVELOPERS.md connected example data (TP53 / UniProt P04637) ------------
// P04637 canonical protein (translated from NM_000546.6); aligned to the
// AlphaFold structure to map genome positions onto residues.
const TP53_PROTEIN =
  'MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGPDEAPRMPEAAPPVAPAPAAPTPAAPAPAPSWPLSSSVPSQKTYQGSYGFRLGFLHSGTAKSVTCTYSPALNKMFCQLAKTCPVQLWVDSTPPPGTRVRAMAIYKQSQHMTEVVRRCPHHERCSDSDGLAPPQHLIRVEGNLRVEYLDDRNTFRHSVVVPYEPPEVGSDCTTIHYNYMCNSSCMGGMNRRPILTIITLEDSSGNLLGRNSFEVRVCACPGRDRRTEEENLRKKGEPHHELPPGSTKRALPNNTSSSPQPKKKPLDGEYFTLQIRGRERFEMFRELNEALELKDAQAGKEPGGSRAHSSHLKSKKGQSTSRHKKLMFKTEGPDSD'

// NM_000546.6 CDS in absolute hg38 coords (0-based half-open) [start, end, phase]
const TP53_CDS = [
  [7676520, 7676594, 0],
  [7676381, 7676403, 1],
  [7675993, 7676272, 0],
  [7675052, 7675236, 0],
  [7674858, 7674971, 2],
  [7674180, 7674290, 0],
  [7673700, 7673837, 1],
  [7673534, 7673608, 2],
  [7670608, 7670715, 0],
  [7669608, 7669690, 1],
]
const TP53_FEATURE = {
  uniqueId: 'NM_000546.6',
  refName: 'chr17',
  start: 7668420,
  end: 7687490,
  strand: -1,
  type: 'mRNA',
  name: 'TP53',
  subfeatures: TP53_CDS.map(([start, end, phase], i) => ({
    uniqueId: `tp53-cds-${i}`,
    refName: 'chr17',
    start,
    end,
    phase,
    type: 'CDS',
    strand: -1,
  })),
}

const STRUCTURE_URL =
  'https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif'

const standaloneSpec = { views: [{ type: 'ProteinView', url: STRUCTURE_URL }] }
const CONNECTED_VIEW = {
  assembly: 'hg38',
  loc: 'chr17:7,668,421-7,687,550',
  tracks: ['hg38-ncbiRefSeq', 'clinvar_ncbi_hg38'],
}
const connectedSpec = {
  views: [
    {
      type: 'ProteinView',
      url: STRUCTURE_URL,
      height: 540,
      userProvidedTranscriptSequence: TP53_PROTEIN,
      feature: TP53_FEATURE,
      connectedView: CONNECTED_VIEW,
    },
  ],
}
// Short form: url/feature/sequence all derived from uniprotId + transcriptId,
// resolved out of the hg38-ncbiRefSeq track at `loc`.
const shortSpec = {
  views: [
    {
      type: 'ProteinView',
      height: 540,
      uniprotId: 'P04637',
      transcriptId: 'NM_000546.6',
      connectedView: CONNECTED_VIEW,
    },
  ],
}
const specUrl = spec =>
  `${APP}&session=${encodeURIComponent(`spec-${JSON.stringify(spec)}`)}`

// --- tiny harness -----------------------------------------------------------
const failures = []
const check = (name, ok, detail) => {
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : ` — ${detail}`}`,
  )
  if (!ok) failures.push(name)
}
const isUp = () =>
  new Promise(res => {
    const s = net.connect(PORT, 'localhost')
    s.on('connect', () => {
      s.destroy()
      res(true)
    })
    s.on('error', () => res(false))
  })
const sleep = ms => new Promise(r => setTimeout(r, ms))

// --- optionally start the dev server ----------------------------------------
let server
async function ensureServer() {
  if (await isUp()) {
    console.log('using already-running dev server on :9000')
    return
  }
  console.log('starting `pnpm start`…')
  server = spawn('pnpm', ['start'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  })
  for (let i = 0; i < 90; i++) {
    await sleep(2000)
    try {
      const r = await fetch(`${BASE}/dist/out.js`)
      if (r.ok) {
        console.log('dev server ready')
        return
      }
    } catch {}
  }
  throw new Error('dev server did not come up on :9000')
}
function stopServer() {
  if (server) {
    spawn('sh', ['-c', `lsof -ti:${PORT},${PORT + 400} | xargs -r kill -9`])
  }
}

// --- run --------------------------------------------------------------------
let browser
try {
  await ensureServer()
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  // 1. standalone structure
  {
    const page = await browser.newPage()
    await page.setViewport({ width: 1100, height: 800 })
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(specUrl(standaloneSpec), {
      waitUntil: 'networkidle2',
      timeout: 90_000,
    })
    let state
    for (let i = 0; i < 40; i++) {
      await sleep(3000)
      state = await page.evaluate(() => {
        const s = window.JBrowseSession
        const st = s?.views?.find(v => v.type === 'ProteinView')
          ?.structures?.[0]
        return { seqLen: st?.structureSequences?.[0]?.length ?? 0 }
      })
      if (state.seqLen > 0) break
    }
    check(
      'standalone: structure sequence extracted',
      state.seqLen > 300,
      `seqLen=${state.seqLen}`,
    )
    check('standalone: no page errors', errors.length === 0, errors[0])
    await page.close()
  }

  // 2. connected genome + protein via connectedView
  {
    const page = await browser.newPage()
    await page.setViewport({
      width: 1280,
      height: 1400,
      deviceScaleFactor: 1.5,
    })
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => {
      if (m.type() === 'error') errors.push(m.text())
    })
    await page.goto(specUrl(connectedSpec), {
      waitUntil: 'networkidle2',
      timeout: 90_000,
    })
    let state
    for (let i = 0; i < 50; i++) {
      await sleep(3000)
      state = await page.evaluate(() => {
        const s = window.JBrowseSession
        const lgv = s?.views?.find(v => v.type === 'LinearGenomeView')
        const pv = s?.views?.find(v => v.type === 'ProteinView')
        const st = pv?.structures?.[0]
        return {
          createdLgv: !!lgv,
          wired: !!lgv && st?.connectedViewId === lgv?.id,
          g2pCount: st?.genomeToTranscriptSeqMapping
            ? Object.keys(st.genomeToTranscriptSeqMapping.g2p).length
            : 0,
          hasAlignment: !!st?.pairwiseAlignment,
          seqLen: st?.structureSequences?.[0]?.length ?? 0,
          canvases: document.querySelectorAll('canvas').length,
        }
      })
      if (state.wired && state.hasAlignment && state.canvases >= 4) break
    }
    check('connected: connectedView created an LGV', state.createdLgv)
    check('connected: structure connectedViewId wired to that LGV', state.wired)
    check(
      'connected: genome->protein mapping built',
      state.g2pCount === 1182,
      `g2p=${state.g2pCount}`,
    )
    check(
      'connected: structure aligned to transcript',
      state.hasAlignment && state.seqLen === 393,
      `seqLen=${state.seqLen}`,
    )
    check(
      'connected: genome tracks rendered (canvases>=4)',
      state.canvases >= 4,
      `canvases=${state.canvases}`,
    )
    check('connected: no console/page errors', errors.length === 0, errors[0])

    fs.mkdirSync('test-screenshots', { recursive: true })
    await page.screenshot({ path: 'test-screenshots/docs-connected.png' })
    await page.close()
  }

  // 3. short form: uniprotId + transcriptId derive everything from the track
  {
    const page = await browser.newPage()
    await page.setViewport({
      width: 1280,
      height: 1400,
      deviceScaleFactor: 1.5,
    })
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => {
      if (m.type() === 'error') errors.push(m.text())
    })
    await page.goto(specUrl(shortSpec), {
      waitUntil: 'networkidle2',
      timeout: 90_000,
    })
    let state
    for (let i = 0; i < 50; i++) {
      await sleep(3000)
      state = await page.evaluate(() => {
        const s = window.JBrowseSession
        const lgv = s?.views?.find(v => v.type === 'LinearGenomeView')
        const pv = s?.views?.find(v => v.type === 'ProteinView')
        const st = pv?.structures?.[0]
        return {
          wired: !!lgv && st?.connectedViewId === lgv?.id,
          // url derived from uniprotId
          derivedUrl: st?.url,
          // feature + sequence resolved from the track, not the spec
          g2pCount: st?.genomeToTranscriptSeqMapping
            ? Object.keys(st.genomeToTranscriptSeqMapping.g2p).length
            : 0,
          hasAlignment: !!st?.pairwiseAlignment,
          seqLen: st?.structureSequences?.[0]?.length ?? 0,
          // protein translated from the track's CDS (stop codon stripped)
          resolvedProtein: (
            st?.userProvidedTranscriptSequence ?? ''
          ).replaceAll('*', ''),
          canvases: document.querySelectorAll('canvas').length,
        }
      })
      if (state.wired && state.hasAlignment && state.canvases >= 4) break
    }
    check(
      'short: url derived from uniprotId',
      state.derivedUrl === STRUCTURE_URL,
      `url=${state.derivedUrl}`,
    )
    check('short: structure connectedViewId wired to the LGV', state.wired)
    check(
      'short: transcript resolved from track (genome->protein mapping built)',
      // 1179 (= 393 codons), not the 1182 of the connected case: ncbiRefSeq's
      // GFF3 annotates CDS without the trailing stop codon, whereas the
      // hand-built TP53_FEATURE above includes it.
      state.g2pCount === 1179,
      `g2p=${state.g2pCount}`,
    )
    check(
      'short: structure aligned to translated transcript',
      state.hasAlignment && state.seqLen === 393,
      `seqLen=${state.seqLen}`,
    )
    // Proves the resolved transcript is genuinely correct, not just 393 long:
    // the protein translated from the track's CDS must equal the canonical
    // P04637 sequence used in the explicit connected case above.
    check(
      'short: translated protein matches canonical P04637',
      state.resolvedProtein === TP53_PROTEIN,
      `len=${state.resolvedProtein.length}`,
    )
    check('short: no console/page errors', errors.length === 0, errors[0])

    await page.screenshot({ path: 'test-screenshots/docs-short.png' })
    await page.close()
  }
} finally {
  await browser?.close()
  stopServer()
}

if (failures.length) {
  console.error(
    `\n${failures.length} doc check(s) failed: ${failures.join(', ')}`,
  )
  process.exit(1)
}
console.log('\nAll doc checks passed.')
process.exit(0)
