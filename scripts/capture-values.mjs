// Opens a gene-explorer session spec on a hosted JBrowse with the local dist
// served as the plugin, colors its ProteinView by the JSON in argv[4], waits
// for the values, and writes a screenshot. The session carries the BRCA1 SGE
// bigWig as a session track. Run `pnpm build:bundle` first.
//   node scripts/capture-values.mjs spec.session.json out.png '{"field":"track",...}'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import puppeteer from 'puppeteer'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const specPath = process.argv[2]
const out = process.argv[3]
const colorJson = process.argv[4] ?? '{}'
const host = process.env.HOST ?? 'https://jbrowse.org/code/jb2/main/'
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
spec.views = spec.views.filter(v => v.type !== 'MsaView')
const pv = spec.views.find(v => v.type === 'ProteinView')
delete spec.layout
delete spec.useWorkspaces
delete spec.activePanelId
const lgv = spec.views.find(v => v.type === 'LinearGenomeView')
lgv.init.loc = 'chr17:43,044,295-43,125,364'
pv.color = JSON.parse(colorJson)
pv.height = 650
spec.sessionTracks = [
  {
    type: 'QuantitativeTrack',
    trackId: 'brca1-sge-residue-mean',
    name: 'BRCA1 SGE residue mean',
    assemblyNames: ['hg38'],
    adapter: {
      type: 'BigWigAdapter',
      uri: 'https://jbrowse.org/demos/brca1/BRCA1.sge.residue_mean.bw',
    },
  },
]
const url = `${host}?config=${encodeURIComponent('/ucsc/hg38/config.json')}&session=json-${encodeURIComponent(JSON.stringify({ session: spec }))}`

const bundle = `${repo}/dist/jbrowse-plugin-protein3d.esm.js`
const CANDIDATE =
  'https://jbrowse.org/plugins/jbrowse-plugin-protein3d/candidate/dist/jbrowse-plugin-protein3d.esm.js'
function point(node) {
  if (Array.isArray(node)) node.forEach(point)
  else if (node && typeof node === 'object') {
    if (
      typeof node.esmUrl === 'string' &&
      node.esmUrl.includes('jbrowse-plugin-protein3d')
    ) {
      delete node.integrity
      node.esmUrl = CANDIDATE
    }
    Object.values(node).forEach(point)
  }
}
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  ],
  defaultViewport: { width: 1500, height: 1500 },
})
const page = await browser.newPage()
const logs = []
page.on('console', m => {
  if (['warn', 'error'].includes(m.type()))
    logs.push(`${m.type()}: ${m.text().slice(0, 300)}`)
})
const client = await page.createCDPSession()
await client.send('Fetch.enable', {
  patterns: [
    { urlPattern: '*jbrowse-plugin-protein3d*', requestStage: 'Request' },
    { urlPattern: '*plugin-store*plugins.json*', requestStage: 'Response' },
  ],
})
client.on(
  'Fetch.requestPaused',
  async ({ requestId, request, responseHeaders }) => {
    try {
      if (responseHeaders) {
        const { body, base64Encoded } = await client.send(
          'Fetch.getResponseBody',
          { requestId },
        )
        const manifest = JSON.parse(
          base64Encoded ? Buffer.from(body, 'base64').toString() : body,
        )
        point(manifest)
        await client.send('Fetch.fulfillRequest', {
          requestId,
          responseCode: 200,
          responseHeaders: responseHeaders.filter(
            h => !/^content-(length|encoding)$/i.test(h.name),
          ),
          body: Buffer.from(JSON.stringify(manifest)).toString('base64'),
        })
        return
      }
      const { pathname } = new URL(request.url)
      const rel = pathname.split('/dist/').slice(1).join('/dist/')
      const file = !rel.endsWith('.js')
        ? undefined
        : rel.includes('/')
          ? path.join(path.dirname(bundle), rel)
          : bundle
      if (!file || !fs.existsSync(file))
        return void client
          .send('Fetch.continueRequest', { requestId })
          .catch(() => {})
      await client.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: 200,
        responseHeaders: [
          { name: 'content-type', value: 'application/javascript' },
          { name: 'access-control-allow-origin', value: '*' },
        ],
        body: fs.readFileSync(file).toString('base64'),
      })
    } catch {
      client.send('Fetch.continueRequest', { requestId }).catch(() => {})
    }
  },
)
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page
  .waitForSelector('[data-testid="protein-view-ready"]', { timeout: 240000 })
  .catch(e => logs.push('NOT READY ' + e))
const read = () =>
  page.evaluate(() => {
    const v = window.JBrowseSession?.views?.find(v => v.type === 'ProteinView')
    const s = v?.structures?.[0]
    const pv = s?.placedValues
    return {
      color: v?.color,
      legend: v?.colorLegendTitle,
      status: s?.statusMessage,
      error: String(s?.error ?? ''),
      placed: pv ? pv.byLabelSeqId.size : null,
      sample: pv ? [...pv.byLabelSeqId].slice(0, 5) : null,
      pending: s?.variantEffectsPending,
      ask: JSON.stringify(s?.variantEffectAsk)?.slice(0, 300),
      ve: s?.variantEffects
        ? {
            key: s.variantEffects.key,
            err: String(s.variantEffects.error ?? ''),
            n: s.variantEffects.values?.byPosition?.size,
          }
        : null,
      probe: (() => {
        const m = s?.variantEffects?.values?.byPosition
        if (!m) return null
        const all = [...m.values()]
        return {
          n: all.length,
          abnormal: all.filter(x => x < -1.328).length,
          intermediate: all.filter(x => x >= -1.328 && x < -0.748).length,
          normal: all.filter(x => x >= -0.748).length,
          M1775: m.get(1774),
          R1699: m.get(1698),
          A1708: m.get(1707),
          S1655: m.get(1654),
          G1738: m.get(1737),
          min: Math.min(...all),
          max: Math.max(...all),
        }
      })(),
      track: !!window.JBrowseSession?.getTrackById('brca1-sge-residue-mean'),
    }
  })
let r
for (let i = 0; i < 90; i++) {
  r = await read()
  if (r.placed || r.error || r.ve?.err) break
  await new Promise(res => setTimeout(res, 2000))
}
await new Promise(res => setTimeout(res, 8000))
r = await read()
r.statusAfter = r.status
console.log(JSON.stringify(r, null, 1))
console.log(logs.slice(0, 15).join('\n'))
await page.screenshot({ path: out })
await browser.close()
