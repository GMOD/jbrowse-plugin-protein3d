#!/usr/bin/env node
//
// Opens every demo link in docs/demos.md and checks the mapping it shows against
// the `<!-- expect {...} -->` comment under the link. With --bundle, serves a
// local build in place of the published plugin, so a mapping change can be
// checked on the demos before release.
//
// Every link needs an expectation. Its fields, each optional:
//   chain           author chain id the transcript maps to
//   minIdentity     identical over aligned columns, at least
//   minAligned      aligned columns, at least; catches unmapping too much
//   unmapped        [start, end) 0-based structure positions that must not map
//   residue         { auth, transcriptPos }: the residue with that author
//                   number maps to that 0-based transcript position
//   noInteriorStop  the translation has no `*` before its end
// Every demo is also checked for one sequence letter per structure position.
//
// Usage:
//   pnpm check-demos
//   node scripts/check-demos.mjs --bundle dist/jbrowse-plugin-protein3d.umd.production.min.js
//
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

import puppeteer from 'puppeteer'

const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
    file: { type: 'string', default: 'docs/demos.md' },
    timeout: { type: 'string', default: '120000' },
  },
})
const timeout = Number(values.timeout)

function parseDemos(markdown) {
  const demos = []
  let current
  for (const line of markdown.split('\n')) {
    const link =
      /\[([^\]]+)\]\((https:\/\/jbrowse\.org\/code\/jb2\/[^)]+)\)/.exec(line)
    const expect = /<!-- expect (\{.*\}) -->/.exec(line)
    if (link) {
      current = { name: link[1], url: link[2] }
      demos.push(current)
    }
    if (expect && current) {
      current.expect = JSON.parse(expect[1])
    }
  }
  return demos
}

function stripPluginIntegrity(node) {
  if (Array.isArray(node)) {
    node.forEach(stripPluginIntegrity)
  } else if (node && typeof node === 'object') {
    if (
      Object.values(node).some(
        v => typeof v === 'string' && v.includes('jbrowse-plugin-protein3d'),
      )
    ) {
      delete node.integrity
    }
    Object.values(node).forEach(stripPluginIntegrity)
  }
}

// Same scoping as host-compat-probe.mjs: only the plugin's own assets are
// intercepted, answered from the local dist by basename. Hosts from v5 pin a
// config's store url to a release and load it with the store manifest's
// subresource-integrity hash, which a local build cannot match, so this
// plugin's hashes come out of the manifest.
async function serveCandidateBundle(page) {
  const dir = path.dirname(values.bundle)
  const mainName = path.basename(values.bundle)
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
      if (responseHeaders) {
        try {
          const { body, base64Encoded } = await client.send(
            'Fetch.getResponseBody',
            { requestId },
          )
          const manifest = JSON.parse(
            base64Encoded ? Buffer.from(body, 'base64').toString() : body,
          )
          stripPluginIntegrity(manifest)
          await client.send('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: responseHeaders.filter(
              h => !/^content-(length|encoding)$/i.test(h.name),
            ),
            body: Buffer.from(JSON.stringify(manifest)).toString('base64'),
          })
        } catch {
          await client
            .send('Fetch.continueRequest', { requestId })
            .catch(() => {})
        }
        return
      }
      const name = path.basename(new URL(request.url).pathname)
      const local = path.join(dir, name)
      const file = !name.endsWith('.js')
        ? undefined
        : name !== mainName && fs.existsSync(local)
          ? local
          : values.bundle
      if (file === undefined) {
        client.send('Fetch.continueRequest', { requestId }).catch(() => {})
      } else {
        client
          .send('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [
              { name: 'content-type', value: 'application/javascript' },
              { name: 'access-control-allow-origin', value: '*' },
            ],
            body: fs.readFileSync(file).toString('base64'),
          })
          .catch(() => {})
      }
    },
  )
}

// SIFTS arrives after the view settles, and the fusion unmapping waits on it
function readStructure() {
  const w = /** @type {Record<string, any>} */ (window)
  const session = w.JBrowseSession ?? w.__jbrowse_session
  const view = session?.views?.find(v => v.type === 'ProteinView')
  const s = view?.structures?.[0]
  if (
    !s?.mappedEntity ||
    (s.pdbId &&
      s.uniProtMappings === undefined &&
      s.uniProtMappingsError === undefined)
  ) {
    return undefined
  }
  return {
    chains: s.mappedEntity.chains,
    seqLength: s.mappedEntity.seq.length,
    seqIdsLength: s.mappedEntity.seqIds.length,
    authSeqIds: s.mappedEntity.authSeqIds,
    structureToTranscript: s.structureSeqToTranscriptSeqPosition,
    transcript: s.userProvidedTranscriptSequence,
    identity: s.alignmentQuality?.identity,
    aligned: s.alignmentQuality?.aligned,
  }
}

function problems(state, expect) {
  if (!expect) {
    return ['no <!-- expect {...} --> for this link']
  }
  const found = []
  if (state.seqLength !== state.seqIdsLength) {
    found.push(
      `sequence has ${state.seqLength} letters for ${state.seqIdsLength} positions`,
    )
  }
  if (expect.chain && !state.chains.includes(expect.chain)) {
    found.push(
      `mapped chain ${state.chains.join('/')}, expected ${expect.chain}`,
    )
  }
  if (
    expect.minIdentity !== undefined &&
    !(state.identity >= expect.minIdentity)
  ) {
    found.push(`identity ${state.identity} under ${expect.minIdentity}`)
  }
  if (
    expect.minAligned !== undefined &&
    !(state.aligned >= expect.minAligned)
  ) {
    found.push(`${state.aligned} aligned columns, under ${expect.minAligned}`)
  }
  if (expect.unmapped) {
    const [start, end] = expect.unmapped
    const mapped = Object.keys(state.structureToTranscript)
      .map(Number)
      .filter(p => p >= start && p < end)
    if (mapped.length > 0) {
      found.push(`${mapped.length} positions in [${start}, ${end}) still map`)
    }
  }
  if (expect.residue) {
    const pos = state.authSeqIds?.indexOf(expect.residue.auth)
    const got = pos >= 0 ? state.structureToTranscript[pos] : undefined
    if (got !== expect.residue.transcriptPos) {
      found.push(
        `residue ${expect.residue.auth} maps to transcript ${got}, expected ${expect.residue.transcriptPos}`,
      )
    }
  }
  if (
    expect.noInteriorStop &&
    state.transcript.replace(/\*+$/, '').includes('*')
  ) {
    found.push('translation has an interior stop')
  }
  return found
}

const demos = parseDemos(fs.readFileSync(values.file, 'utf8'))
if (demos.length === 0) {
  throw new Error(`no demo links in ${values.file}`)
}
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--use-gl=swiftshader'],
  defaultViewport: { width: 1400, height: 900 },
})
let failed = 0
for (const demo of demos) {
  const page = await browser.newPage()
  if (values.bundle) {
    await serveCandidateBundle(page)
  }
  let found
  let state
  try {
    await page.goto(demo.url, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    const handle = await page.waitForFunction(readStructure, {
      timeout,
      polling: 500,
    })
    state = await handle.jsonValue()
    found = problems(state, demo.expect)
  } catch (e) {
    const text = await page
      .evaluate(() =>
        document.body.innerText.replace(/\s+/g, ' ').slice(0, 300),
      )
      .catch(() => '')
    found = [`did not settle: ${String(e).slice(0, 120)} | page: ${text}`]
  }
  await page.close()
  if (found.length > 0) {
    failed++
  }
  const summary = state
    ? ` (${state.aligned} aligned, ${Math.round((state.identity ?? 0) * 100)}% identity)`
    : ''
  console.log(
    `${found.length ? 'FAIL' : 'ok  '} ${demo.name}${summary}${found.length ? `\n     ${found.join('\n     ')}` : ''}`,
  )
}
await browser.close()
process.exit(failed ? 1 : 0)
