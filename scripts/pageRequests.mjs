/**
 * Waits for the requests a page makes from now on to settle, leaving out the
 * host's own static chunks under `hostStatic`. `page.waitForNetworkIdle`
 * counts what CDP never marks finished, and on about a third of session-spec
 * loads the nightly left five requests for one preloaded host chunk open with
 * nothing loading (measured 2026-10-10), so the wait ran out its timeout.
 *
 * @param {import('puppeteer').Page} page
 * @param {string} hostStatic
 */
export function trackPageRequests(page, hostStatic) {
  /** @type {Set<import('puppeteer').HTTPRequest>} */
  const inFlight = new Set()
  let lastChange = Date.now()
  /** @param {import('puppeteer').HTTPRequest} request */
  const started = request => {
    if (!request.url().startsWith(hostStatic)) {
      inFlight.add(request)
      lastChange = Date.now()
    }
  }
  /** @param {import('puppeteer').HTTPRequest} request */
  const settled = request => {
    if (inFlight.delete(request)) {
      lastChange = Date.now()
    }
  }
  page.on('request', started)
  page.on('requestfinished', settled)
  page.on('requestfailed', settled)
  return {
    /**
     * @param {number} idleMs
     * @param {number} timeoutMs
     */
    async idle(idleMs, timeoutMs) {
      const deadline = Date.now() + timeoutMs
      try {
        while (inFlight.size > 0 || Date.now() - lastChange < idleMs) {
          if (Date.now() > deadline) {
            throw new Error(
              `requests still open after ${timeoutMs}ms: ${[...inFlight].map(r => r.url()).join(', ')}`,
            )
          }
          await new Promise(resolve => setTimeout(resolve, 250))
        }
      } finally {
        page.off('request', started)
        page.off('requestfinished', settled)
        page.off('requestfailed', settled)
      }
    },
  }
}
