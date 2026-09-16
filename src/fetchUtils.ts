export function hostOf(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

const MAX_DETAIL = 200

function firstLine(body: string) {
  const line = body.split('\n', 1)[0]?.trim() ?? ''
  return line.length > MAX_DETAIL ? `${line.slice(0, MAX_DETAIL)}…` : line
}

/**
 * The error a failed response deserves: status and host, plus at most the first
 * line of the body. A whole body is an HTML error page or a megabyte of JSON,
 * and pasting it into the dialog buries the one line that says what went wrong.
 */
export async function httpError(response: Response, url: string) {
  const detail = firstLine(await response.text().catch(() => ''))
  const status = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''} from ${hostOf(url)}`
  return new Error(detail ? `${status}: ${detail}` : status)
}

/**
 * `fetch` rejects with a bare `TypeError: Failed to fetch` for a DNS failure,
 * an offline browser and a refused cross-origin request alike, naming neither
 * the host nor the cause. Anything else — an abort, most notably — passes
 * through untouched.
 */
export function networkError(url: string, cause: unknown) {
  return cause instanceof TypeError
    ? new Error(
        `Could not reach ${hostOf(url)}. Check your network connection; the server may also be refusing cross-origin requests from this page.`,
        { cause },
      )
    : cause
}

export async function rawfetch(url: string, args?: RequestInit) {
  try {
    return await fetch(url, args)
  } catch (e) {
    throw networkError(url, e)
  }
}

export async function myfetch(url: string, args?: RequestInit) {
  const response = await rawfetch(url, args)

  if (!response.ok) {
    throw await httpError(response, url)
  }

  return response
}

export async function jsonfetch<T = unknown>(
  url: string,
  args?: RequestInit,
): Promise<T> {
  const response = await myfetch(url, args)
  return response.json()
}

/**
 * An AbortSignal's reason as a real Error. `signal.reason` is `any` — usually a
 * DOMException, but a caller can abort with anything at all — and throwing a
 * non-Error loses the stack and breaks `instanceof Error` checks in the UI's
 * error rendering. Normalize at every throw site.
 */
export function abortError(signal: AbortSignal) {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error('Aborted', { cause: signal.reason })
}

export function timeout(time: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal))
    } else {
      const id = setTimeout(resolve, time)
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(id)
          reject(abortError(signal))
        },
        { once: true },
      )
    }
  })
}
