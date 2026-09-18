// Drives the local build on .test-jbrowse-nightly: `ensureServer` starts
// `pnpm start` on :9000 unless one is already running.
import { spawn } from 'node:child_process'
import net from 'node:net'

export const PORT = 9000
export const BASE = `http://localhost:${PORT}`
export const APP = `${BASE}/.test-jbrowse-nightly/?config=/config.json`

// "The genome track painted", in every shape the hosts render it. Counting
// canvases used to stand in for this, but that was a proxy for the old
// block-based renderer (many canvases); current main draws one GPU canvas per
// display, so the count dropped below the threshold on a page that had in fact
// rendered. Keep this in step with PAINTED_FEATURES in test/setup.ts.
export const PAINTED_FEATURES = [
  'canvas[data-testid$="_done"]',
  '[data-testid^="box-"]',
  '[data-testid$="-done"] [data-display-phase="ready"]',
  '[data-display-drawn="true"][data-display-phase="ready"]',
].join(', ')

export const specUrl = spec =>
  `${APP}&session=${encodeURIComponent(`spec-${JSON.stringify(spec)}`)}`

export const sleep = ms => new Promise(r => setTimeout(r, ms))

const isUp = () =>
  new Promise(res => {
    const s = net.connect(PORT, 'localhost')
    s.on('connect', () => {
      s.destroy()
      res(true)
    })
    s.on('error', () => res(false))
  })

let server

export async function ensureServer() {
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

export function stopServer() {
  if (server) {
    spawn('sh', ['-c', `lsof -ti:${PORT},${PORT + 400} | xargs -r kill -9`])
  }
}
