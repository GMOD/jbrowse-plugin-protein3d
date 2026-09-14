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

// Hosts that predate main's `session.setPendingMove`.
const V4_ERA = new Set(['v3.7.0', 'v4.0.4', 'v4.3.0'])

// Warnings this plugin has read and owes a fix for. Each is a debt with an exit
// condition, not a decision to stop looking — delete an entry and the gate
// starts failing on it again. `expectedOn` scopes one to the hosts where it
// means what the comment says, because the same sentence can be a known
// limitation on one host and an alarm on another.
const KNOWN_DEBT: { needle: string; expectedOn?: Set<string> }[] = [
  {
    // v5 unwraps v4's nested `init` and warns; v4.3.0's LinearGenomeView has no
    // other way in (`init: types.frozen<InitState>()` plus the autorun in
    // `afterAttach.ts` that reads it), so `addView` in
    // LaunchProteinViewExtensionPoint has to keep writing it while a v4 host is
    // supported. Drop the nesting there, and this entry, together with v4.
    needle: 'nests its settings under "init"',
  },
  {
    // sideBySide.ts says this on purpose. Releases through v4.3.0 expose
    // `setUseWorkspaces` but place views through @jbrowse/app-core's
    // `setPendingMoveToSplitRight`, so the protein view stacks instead of
    // landing beside the genome — a known v4 limitation nobody is wiring up.
    // On a newer host the identical line means the session API moved out from
    // under the plugin, which is a break, so it is excused only where it is
    // expected. See CLAUDE.md, "Host compatibility".
    needle: 'supports workspaces but not setPendingMove',
    expectedOn: V4_ERA,
  },
]

export function isBrowserConsoleNoise(text: string, host: string): boolean {
  if (text.includes('[WebGL2Hal #')) {
    return !text.includes('context LOST') && !text.includes('GL error')
  }
  return (
    GPU_NOISE.some(n => text.includes(n)) ||
    KNOWN_DEBT.some(
      d => text.includes(d.needle) && (!d.expectedOn || d.expectedOn.has(host)),
    )
  )
}
