import { expect, test } from 'vitest'

import { isBrowserConsoleNoise } from './browserConsole'

const SIDE_BY_SIDE =
  'jbrowse-plugin-protein3d: this session supports workspaces but not setPendingMove, so the side-by-side launch was skipped'

test('a host warning nobody has read is not noise', () => {
  expect(
    isBrowserConsoleNoise(
      'LinearGenomeView ignored unknown key(s): loc',
      'main',
    ),
  ).toBe(false)
})

test('swiftshader narration is noise on every host', () => {
  expect(
    isBrowserConsoleNoise('[GPU] No compatible GPU adapter available', 'main'),
  ).toBe(true)
})

// upstream's own carve-out, from products/jbrowse-capture/src/browser.ts
test('a real GPU failure is not noise even inside the WebGL2Hal prefix', () => {
  expect(isBrowserConsoleNoise('[WebGL2Hal #3] resized', 'main')).toBe(true)
  expect(isBrowserConsoleNoise('[WebGL2Hal #3] context LOST', 'main')).toBe(
    false,
  )
  expect(isBrowserConsoleNoise('[WebGL2Hal #3] GL error 1285', 'main')).toBe(
    false,
  )
})

// The entry that made scoping worth having: a known v4 limitation, and an alarm
// anywhere newer. Excusing it everywhere would delete the alarm it exists for.
test('the side-by-side warning is expected on v4 and a break on main', () => {
  expect(isBrowserConsoleNoise(SIDE_BY_SIDE, 'v4.3.0')).toBe(true)
  expect(isBrowserConsoleNoise(SIDE_BY_SIDE, 'main')).toBe(false)
  expect(isBrowserConsoleNoise(SIDE_BY_SIDE, 'nightly')).toBe(false)
})

test('the init deprecation is expected everywhere until v4 support goes', () => {
  const init = 'LinearGenomeView nests its settings under "init"'
  expect(isBrowserConsoleNoise(init, 'v4.3.0')).toBe(true)
  expect(isBrowserConsoleNoise(init, 'nightly')).toBe(true)
})
