import { expect, test } from 'vitest'

import { isBrowserConsoleNoise } from '../scripts/browserConsole.mjs'

test('a host warning nobody has read is not noise', () => {
  expect(
    isBrowserConsoleNoise('LinearGenomeView ignored unknown key(s): loc'),
  ).toBe(false)
})

test('swiftshader narration is noise', () => {
  expect(
    isBrowserConsoleNoise('[GPU] No compatible GPU adapter available'),
  ).toBe(true)
})

// upstream's own carve-out, from products/jbrowse-capture/src/browser.ts
test('a real GPU failure is not noise even inside the WebGL2Hal prefix', () => {
  expect(isBrowserConsoleNoise('[WebGL2Hal #3] resized')).toBe(true)
  expect(isBrowserConsoleNoise('[WebGL2Hal #3] context LOST')).toBe(false)
  expect(isBrowserConsoleNoise('[WebGL2Hal #3] GL error 1285')).toBe(false)
})

test("the host's unused preload hint is noise, a plugin chunk's is not", () => {
  const hint = (url: string) =>
    `The resource ${url} was preloaded using link preload but not used within a few seconds from the window's load event.`
  expect(
    isBrowserConsoleNoise(
      hint(
        'https://jbrowse.org/code/jb2/main/static/js/62604.a8ea5de0.chunk.js',
      ),
    ),
  ).toBe(true)
  expect(
    isBrowserConsoleNoise(
      hint(
        'https://jbrowse.org/plugins/jbrowse-plugin-protein3d/latest/dist/chunks/chunk-ABC.js',
      ),
    ),
  ).toBe(false)
})
