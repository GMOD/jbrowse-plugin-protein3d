# Testing

Every host outage so far passed tsc and eslint, so the suites that matter most
boot the built bundle in a real browser and fail on anything the page logs at
warn or error.

| Command            | What it checks                                                                         |
| ------------------ | -------------------------------------------------------------------------------------- |
| `pnpm test`        | Unit tests plus the e2e suite on a nightly JBrowse                                     |
| `pnpm test:docs`   | The session-spec examples in [launching](launching.md)                                 |
| `pnpm check-demos` | Every link in [demos](demos.md) against its expected mapping                           |
| `pnpm host-compat` | The plugin on hosted JBrowse releases, see [host compatibility](host-compatibility.md) |

`pnpm test:docs` starts `pnpm start` itself if nothing is listening on :9000,
and the `Daily` workflow runs it, so a dead AlphaFold URL or a broken launch
path shows up as a failed nightly rather than as a bug report.

## The E2E suite

`test/plugin.test.ts` drives a real `jbrowse create` instance with the built umd
bundle (`TEST_JBROWSE_VERSION=<version> pnpm vitest run test/plugin.test.ts`;
`SKIP_BUILD=1` reuses `dist/`). It clicks all the way through: right-click a
gene → `Launch protein view` → wait for the dialog to finish resolving → Launch
→ molstar draws the structure.

Every step asserts. There is no logged-and-continue path, because a suite that
returns early on "no menu items" passes green against a bundle that error-pages
the whole app — which is exactly what it did before. In particular:

- the umd global has to exist (a bundle that throws never defines it),
- the context menu has to contain the plugin's item,
- `Launch` has to become enabled, and the molstar canvas has to end up with
  actual pixels drawn — the container mounts ~5s before the structure appears,
  so waiting on the container alone screenshots an empty viewer,
- the session's structure has to be aligned, with its genome→protein mapping
  covering the whole translated transcript,
- the page has logged nothing at warn or error beyond the known entries in
  `scripts/browserConsole.mjs`.

The suite asserts the mapping is consistent with whatever transcript arrived
rather than pinning a length, because hosts differ in what they hand the context
menu. `pnpm test` fetches the nightly zip into `.test-jbrowse-nightly` only when
that directory is missing, so a local copy freezes at whatever `main` was the
day it was made. When a nightly leg fails, check its date before your diff.

## Screenshots

The E2E suites write reference PNGs under `test-screenshots/`. A failing run
writes its captures to `test-screenshots/failed/<version>/` (gitignored) instead
of over the committed references, so a broken run never promotes pictures of the
broken app to the new baseline. puppeteer captures aren't pixel-deterministic
(antialiasing, WebGL, font hinting), so `scripts/pngSnapshot.mjs` normalizes
each capture through `pngquant --nofs` and only overwrites a committed PNG when
more than ~1% of pixels differ. Tune the threshold with `SCREENSHOT_DIFF_RATIO`
(`0` always rewrites, `0.05` tolerates larger wobble). `pngquant` is optional;
without it the raw PNG is used.

## What none of these see

What a protein-browser or hub session does on jbrowse.org is outside every suite
here. [Live checks](live-checks.md) has the recipe for serving `dist/` to a
hosted release and reading the model back.
