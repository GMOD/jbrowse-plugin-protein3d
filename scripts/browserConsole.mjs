// What the host is allowed to say. Everything else the page logs at warn or
// error fails the test that was running, because a console line is the only
// place several host incompatibilities have ever shown themselves: the bundle
// that resolved a missing re-export, the menu contribution that threw inside an
// ErrorBoundary, the MUI major whose SvgIcon had a different shape. None of
// those reach tsc, eslint or a url check, and a run that merely prints them
// relies on somebody reading the scrollback.
//
// The first group is upstream's own list, kept in step with
// `products/jbrowse-capture/src/browser.ts` in jbrowse-components, and it
// carries upstream's rule: a real GPU failure (`context LOST`, `GL error`) is
// NOT noise. CI has no GPU, so swiftshader narrates.
const GPU_NOISE = [
  'favicon',
  'GPU stall',
  '[GPU] WebGPU not supported',
  '[GPU] No compatible GPU adapter',
  '[GPU] WebGPU initialization failed',
  '[GPU] WebGL2 unavailable',
  '[GPU] WebGPU device creation failed',
  '[GPU] WebGL2 here is software-rendered',
  'GroupMarkerNotSet',
  'Automatic fallback to software WebGL',
  'No available adapters',
  'Failed to create WebGPU Context Provider',
]

// jbrowse-web's index.html preloads a set of its own chunks (since the build
// hosted on `main` 2026-10-08), and Chrome warns about each one a session did
// not get to within a few seconds of load. Which ones depends on the views the
// session opens, so a ProteinView launch leaves two unused. Scoped to the
// host's static chunks: the same warning about a plugin file would be ours.
function isHostPreloadHint(text) {
  return (
    text.includes('was preloaded using link preload but not used') &&
    /\/static\/js\/[\w.]+\.chunk\.js/.test(text) &&
    !text.includes('jbrowse-plugin-')
  )
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isBrowserConsoleNoise(text) {
  if (isHostPreloadHint(text)) {
    return true
  }
  if (text.includes('[WebGL2Hal #')) {
    return !text.includes('context LOST') && !text.includes('GL error')
  }
  return GPU_NOISE.some(n => text.includes(n))
}
