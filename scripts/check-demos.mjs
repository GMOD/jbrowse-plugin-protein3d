#!/usr/bin/env node
//
// Opens every demo link in docs/demos.md and checks the mapping it shows against
// the `<!-- expect {...} -->` comment under the link. With --bundle, serves a
// local build in place of the published plugin, so a mapping change can be
// checked on the demos before release.
//
// Every link needs an expectation. Its fields, each optional, describe the
// view's first structure:
//   chain           author chain id the transcript maps to
//   minIdentity     identical over aligned columns, at least
//   minAligned      aligned columns, at least; catches unmapping too much
//   unmapped        [start, end) 0-based structure positions that must not map
//   residue         { auth, transcriptPos }: the residue with that author
//                   number maps to that 0-based transcript position
//   selected        { auth, transcriptPos }: the view opens with exactly that
//                   residue selected, and it maps as `residue` would
//   noInteriorStop  the translation has no `*` before its end
//   models          Mol* structures the load made; an NMR ensemble makes one
//                   per model
// A view of several structures takes `structures`, one such object per
// structure in order, and `superposed`, how many TM-align must cover. Every
// demo is also checked for one sequence letter per structure position, and
// fails on anything the page logs at warn or error that browserConsole.mjs
// does not excuse for the link's host.
//
// Usage:
//   pnpm check-demos
//   node scripts/check-demos.mjs --bundle dist/jbrowse-plugin-protein3d.umd.production.min.js
//
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

import puppeteer from 'puppeteer'

import { isBrowserConsoleNoise } from './browserConsole.mjs'

const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
    file: { type: 'string', default: 'docs/demos.md' },
    timeout: { type: 'string', default: '300000' },
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
function readView() {
  const w = /** @type {Record<string, any>} */ (window)
  const session = w.JBrowseSession ?? w.__jbrowse_session
  const view = session?.views?.find(v => v.type === 'ProteinView')
  const structures = view?.structures ?? []
  if (
    structures.length === 0 ||
    structures.some(
      s =>
        !s.mappedEntity ||
        s.loading ||
        (s.pdbId &&
          s.uniProtMappings === undefined &&
          s.uniProtMappingsError === undefined),
    )
  ) {
    return undefined
  }
  return {
    superposed: view.superposedCount,
    structures: structures.map(s => ({
      chains: s.mappedEntity.chains,
      seqLength: s.mappedEntity.seq.length,
      seqIdsLength: s.mappedEntity.seqIds.length,
      authSeqIds: s.mappedEntity.authSeqIds,
      structureToTranscript: s.structureSeqToTranscriptSeqPosition,
      transcript: s.userProvidedTranscriptSequence,
      identity: s.alignmentQuality?.identity,
      aligned: s.alignmentQuality?.aligned,
      models: s.molstarStructures?.length,
      selected:
        s.clickedStructureRanges ??
        (s.clickedStructureRange ? [s.clickedStructureRange] : []),
    })),
  }
}

function superposedAtLeast(n) {
  const w = /** @type {Record<string, any>} */ (window)
  const session = w.JBrowseSession ?? w.__jbrowse_session
  const view = session?.views?.find(v => v.type === 'ProteinView')
  return view?.superposedCount >= n
}

function transcriptPosOfAuth(state, auth) {
  const pos = state.authSeqIds?.indexOf(auth)
  return pos >= 0 ? state.structureToTranscript[pos] : undefined
}

function problems(state, expect) {
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
    const got = transcriptPosOfAuth(state, expect.residue.auth)
    if (got !== expect.residue.transcriptPos) {
      found.push(
        `residue ${expect.residue.auth} maps to transcript ${got}, expected ${expect.residue.transcriptPos}`,
      )
    }
  }
  if (expect.selected) {
    const { auth, transcriptPos } = expect.selected
    const pos = state.authSeqIds?.indexOf(auth)
    const ranges = state.selected
    if (
      ranges.length !== 1 ||
      ranges[0].start !== pos ||
      ranges[0].end !== pos + 1
    ) {
      found.push(
        `selection ${JSON.stringify(ranges)}, expected residue ${auth} at position ${pos}`,
      )
    }
    const got = transcriptPosOfAuth(state, auth)
    if (got !== transcriptPos) {
      found.push(
        `selected residue ${auth} maps to transcript ${got}, expected ${transcriptPos}`,
      )
    }
  }
  if (expect.models !== undefined && state.models !== expect.models) {
    found.push(`${state.models} Mol* structures, expected ${expect.models}`)
  }
  if (
    expect.noInteriorStop &&
    state.transcript.replace(/\*+$/, '').includes('*')
  ) {
    found.push('translation has an interior stop')
  }
  return found
}

function viewProblems(view, expect) {
  if (!expect) {
    return ['no <!-- expect {...} --> for this link']
  }
  const perStructure = expect.structures ?? [expect]
  const found = []
  if (view.structures.length !== perStructure.length) {
    found.push(
      `${view.structures.length} structures, expected ${perStructure.length}`,
    )
  }
  view.structures.forEach((state, i) => {
    const label = view.structures.length > 1 ? `structure ${i}: ` : ''
    found.push(
      ...problems(state, perStructure[i] ?? {}).map(p => `${label}${p}`),
    )
  })
  if (
    expect.superposed !== undefined &&
    !(view.superposed >= expect.superposed)
  ) {
    found.push(
      `superposition covered ${view.superposed}, expected ${expect.superposed}`,
    )
  }
  return found
}

function hostOf(url) {
  return /\/code\/jb2\/([^/]+)\//.exec(url)?.[1] ?? 'unknown'
}

const demos = parseDemos(fs.readFileSync(values.file, 'utf8'))
if (demos.length === 0) {
  throw new Error(`no demo links in ${values.file}`)
}
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  defaultViewport: { width: 1400, height: 900 },
})
let failed = 0
for (const demo of demos) {
  const page = await browser.newPage()
  const host = hostOf(demo.url)
  const complaints = []
  const heard = (type, text) => {
    if (!isBrowserConsoleNoise(text, host)) {
      complaints.push(`[${type}] ${text.slice(0, 200)}`)
    }
  }
  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warn') {
      heard(m.type(), m.text())
    }
  })
  page.on('pageerror', e => {
    heard('pageerror', String(e))
  })
  if (values.bundle) {
    await serveCandidateBundle(page)
  }
  let found
  let view
  try {
    await page.goto(demo.url, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    const handle = await page.waitForFunction(readView, {
      timeout,
      polling: 500,
    })
    view = await handle.jsonValue()
    if (demo.expect?.superposed !== undefined) {
      view.superposed = await page
        .waitForFunction(
          superposedAtLeast,
          { timeout, polling: 500 },
          demo.expect.superposed,
        )
        .then(
          () => demo.expect.superposed,
          () => page.evaluate(readView).then(v => v?.superposed),
        )
    }
    found = viewProblems(view, demo.expect)
  } catch (e) {
    const text = await page
      .evaluate(() => {
        const w = /** @type {Record<string, any>} */ (window)
        const session = w.JBrowseSession ?? w.__jbrowse_session
        const view = session?.views?.find(v => v.type === 'ProteinView')
        const waiting = view?.structures?.map(s =>
          s.error
            ? `error: ${s.error}`
            : (s.loadingMessage ??
              (s.mappedEntity ? 'settled' : 'no mapped entity')),
        )
        return waiting
          ? `structures: ${waiting.join('; ')}`
          : `page: ${document.body.innerText.replace(/\s+/g, ' ').slice(0, 300)}`
      })
      .catch(() => '')
    found = [`did not settle: ${String(e).slice(0, 120)} | ${text}`]
  }
  found.push(...[...new Set(complaints)].map(c => `the page said ${c}`))
  await page.close()
  if (found.length > 0) {
    failed++
  }
  const summary = view
    ? ` (${view.structures
        .map(
          s =>
            `${s.aligned} aligned, ${Math.round((s.identity ?? 0) * 100)}% identity`,
        )
        .join('; ')})`
    : ''
  console.log(
    `${found.length ? 'FAIL' : 'ok  '} ${demo.name}${summary}${found.length ? `\n     ${found.join('\n     ')}` : ''}`,
  )
}
await browser.close()
process.exit(failed ? 1 : 0)
