import { afterEach, describe, expect, it, test, vi } from 'vitest'

import { httpError, myfetch, networkError, timeout } from './fetchUtils'

test('timeout resolves after the delay', async () => {
  await expect(timeout(1)).resolves.toBeUndefined()
})

test('timeout rejects immediately if the signal is already aborted', async () => {
  const controller = new AbortController()
  controller.abort()
  await expect(timeout(10_000, controller.signal)).rejects.toThrow()
})

test('timeout rejects when the signal aborts mid-wait', async () => {
  const controller = new AbortController()
  const p = timeout(10_000, controller.signal)
  controller.abort()
  await expect(p).rejects.toThrow()
})

test('timeout preserves a custom Error abort reason', async () => {
  const controller = new AbortController()
  const reason = new Error('dialog closed')
  controller.abort(reason)
  await expect(timeout(10_000, controller.signal)).rejects.toBe(reason)
})

const URL_UNDER_TEST = 'https://rest.uniprot.org/uniprotkb/search?query=x'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('httpError', () => {
  it('names the status and the host, not the whole url', async () => {
    const error = await httpError(
      new Response('', { status: 404, statusText: 'Not Found' }),
      URL_UNDER_TEST,
    )
    expect(error.message).toBe('HTTP 404 Not Found from rest.uniprot.org')
  })

  it('keeps the first line of the body and drops the rest', async () => {
    const body = ['Accession not found', '<html>', 'x'.repeat(5000)].join('\n')
    const error = await httpError(
      new Response(body, { status: 400, statusText: 'Bad Request' }),
      URL_UNDER_TEST,
    )
    expect(error.message).toBe(
      'HTTP 400 Bad Request from rest.uniprot.org: Accession not found',
    )
  })

  it('truncates a single enormous line', async () => {
    const error = await httpError(
      new Response('y'.repeat(5000), { status: 500 }),
      URL_UNDER_TEST,
    )
    expect(error.message.length).toBeLessThan(300)
    expect(error.message).toMatch(/…$/)
  })
})

describe('networkError', () => {
  it('turns "Failed to fetch" into one sentence naming the host', () => {
    const mapped = networkError(
      URL_UNDER_TEST,
      new TypeError('Failed to fetch'),
    )
    expect(mapped).toBeInstanceOf(Error)
    expect(String(mapped)).toContain('Could not reach rest.uniprot.org')
    expect(String(mapped)).toContain('cross-origin')
  })

  it('passes anything else through untouched, an abort above all', () => {
    const abort = new DOMException('aborted', 'AbortError')
    expect(networkError(URL_UNDER_TEST, abort)).toBe(abort)
  })
})

describe('myfetch', () => {
  it('reports an unreachable host rather than a bare TypeError', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.reject(new TypeError('Failed to fetch')),
    )
    await expect(myfetch(URL_UNDER_TEST)).rejects.toThrow(
      /Could not reach rest\.uniprot\.org/,
    )
  })
})
