import puppeteer from 'puppeteer'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = '/home/cdiesh/src/jb2plugins/jbrowse-plugin-protein3d'
const JBROWSE_DIR = path.join(ROOT, '.test-jbrowse-v4.3.0')
const PLUGIN_DIST = path.join(ROOT, 'dist')
const PORT = 9876

const pluginDir = path.join(JBROWSE_DIR, 'plugin')
fs.mkdirSync(pluginDir, { recursive: true })
fs.cpSync(PLUGIN_DIST, pluginDir, { recursive: true })

const config = {
  plugins: [
    {
      name: 'Protein3d',
      url: `http://localhost:${PORT}/plugin/jbrowse-plugin-protein3d.umd.production.min.js`,
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
      trackId: 'gencode.v44.annotation.sorted.gff3',
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
    name: 'Test',
    views: [
      {
        id: 'test_lgv',
        type: 'LinearGenomeView',
        init: {
          loc: 'chr1:114,704,469-114,716,894',
          assembly: 'hg38',
          tracks: ['gencode.v44.annotation.sorted.gff3'],
        },
      },
    ],
  },
}
fs.writeFileSync(
  path.join(JBROWSE_DIR, 'config.json'),
  JSON.stringify(config, null, 2),
)

try {
  await new Promise(r => {
    const p = spawn('sh', ['-c', `lsof -ti:${PORT} | xargs -r kill -9`])
    p.on('exit', r)
  })
} catch {}

const server = spawn('npx', ['serve', '-p', String(PORT), '-s', JBROWSE_DIR], {
  stdio: ['ignore', 'pipe', 'pipe'],
})
await new Promise(resolve => {
  const onData = data => {
    const s = data.toString()
    if (s.includes('Accepting connections')) resolve()
  }
  server.stdout.on('data', onData)
  server.stderr.on('data', onData)
})
console.log('server up')

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })

page.on('console', async msg => {
  const t = msg.text()
  if (
    msg.type() === 'error' ||
    t.includes('protein3d') ||
    t.includes('mobx-state-tree') ||
    t.includes('matching type') ||
    t.includes('[direct]') ||
    t.includes('ErrorBoundary') ||
    t.includes('CAUGHT_ERROR_STACK') ||
    t.includes('REACT_COMPONENT_STACK') ||
    t.includes('WINDOW_ERROR_STACK')
  ) {
    console.log(`[browser ${msg.type()}] ${t.slice(0, 800)}`)
    for (const arg of msg.args()) {
      try {
        const v = await arg.jsonValue()
        if (v && typeof v === 'object' && (v.stack || v.message)) {
          console.log(
            `  arg: ${JSON.stringify({ message: v.message, stack: v.stack }).slice(0, 1500)}`,
          )
        }
      } catch {}
    }
    const loc = msg.location()
    if (loc?.url) {
      console.log(`  at ${loc.url}:${loc.lineNumber}:${loc.columnNumber}`)
    }
  }
})
page.on('pageerror', err => {
  console.log(`[page error] ${err.message.slice(0, 800)}`)
  if (err.stack) console.log(`[page error stack] ${err.stack.slice(0, 2000)}`)
})

await page.evaluateOnNewDocument(() => {
  const origConsoleError = console.error
  console.error = (...args) => {
    for (const a of args) {
      if (a instanceof Error) {
        console.log('CAUGHT_ERROR_STACK: ' + (a.stack || a.message))
      } else if (a && typeof a === 'object' && a.componentStack) {
        console.log('REACT_COMPONENT_STACK: ' + a.componentStack)
      }
    }
    return origConsoleError.apply(this, args)
  }
  window.addEventListener('error', e => {
    if (e.error?.stack) {
      console.log('WINDOW_ERROR_STACK: ' + e.error.stack)
    }
  })
})
await page.goto(`http://localhost:${PORT}/`, {
  waitUntil: 'networkidle2',
  timeout: 60_000,
})
await page.waitForFunction(
  () => document.querySelector('#root')?.children.length,
  { timeout: 30_000 },
)
console.log('jbrowse loaded')
// Wait longer for assembly + tracks to be ready
await new Promise(r => setTimeout(r, 5000))
const state = await page.evaluate(() => ({
  hasJBrowseSession: !!window.JBrowseSession,
  views: window.JBrowseSession?.views?.length,
  viewTypes: window.JBrowseSession?.views?.map(v => v.type),
  lgvTracks: window.JBrowseSession?.views?.[0]?.tracks?.map(t => ({
    name: t.name,
    initialized: t.initialized,
  })),
  bodyText: document.body.innerText.slice(0, 400),
}))
console.log('state:', JSON.stringify(state, null, 2))

// wait for track to render so we can fetch a real feature
try {
  await page.waitForFunction(
    () => {
      const canvases = [...document.querySelectorAll('canvas')]
      return canvases.some(c => c.width > 200)
    },
    { timeout: 120_000 },
  )
} catch (e) {
  console.log('timeout waiting for canvas; continuing anyway')
  console.log(
    'canvas count:',
    await page.evaluate(() => document.querySelectorAll('canvas').length),
  )
}
await new Promise(r => setTimeout(r, 8000))

const result = await page.evaluate(async () => {
  const session = window.JBrowseSession
  if (!session) {
    return {
      error:
        'no JBrowseSession; keys=' +
        Object.keys(window)
          .filter(k => k.startsWith('JBrowse'))
          .join(','),
    }
  }
  const view = session.views.find(v => v.type === 'LinearGenomeView')
  if (!view) return { error: 'no LGV' }
  // synthesize a minimal transcript feature instead of pulling from track
  const featureJson = {
    uniqueId: 'transcript-test',
    refName: 'chr1',
    start: 114704469,
    end: 114716894,
    type: 'mRNA',
    name: 'TEST',
    subfeatures: [
      {
        uniqueId: 'exon1',
        refName: 'chr1',
        start: 114704469,
        end: 114704600,
        type: 'CDS',
      },
    ],
  }

  const snap = {
    type: 'ProteinView',
    isFloating: true,
    alignmentAlgorithm: 'needleman_wunsch',
    connectedMsaViewId: undefined,
    structures: [
      {
        url: 'https://alphafold.ebi.ac.uk/files/AF-P12345-F1-model_v6.cif',
        data: undefined,
        userProvidedTranscriptSequence: '',
        feature: featureJson,
        connectedViewId: view.id,
      },
    ],
    displayName: 'Protein view - TEST',
  }

  console.log('[direct] featureJson size:', JSON.stringify(featureJson).length)
  console.log(
    '[direct] featureJson keys:',
    JSON.stringify(Object.keys(featureJson)),
  )
  console.log(
    '[direct] featureJson preview:',
    JSON.stringify(featureJson).slice(0, 800),
  )
  try {
    const v = session.addView('ProteinView', snap)
    return { ok: true, viewType: v.type, viewId: v.id }
  } catch (e) {
    return { error: e.message.slice(0, 2000) }
  }
})
console.log('result:', JSON.stringify(result, null, 2))

await browser.close()
server.kill('SIGTERM')
setTimeout(() => server.kill('SIGKILL'), 2000)
process.exit(0)
