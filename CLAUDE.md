# jbrowse-plugin-protein3d

Opens a Mol\* protein view from a genomic feature. Rationale, measurements and
runbooks: `agent-docs/reference/`.

## Where a change goes

- **Change a mapping rule in `p2s_mapper` (`~/src/gmod/p2s_mapper`)** and test
  it there: the aligner, coordinate maps, chain choice, sequence extraction,
  `structureFormat` and the RCSB/AlphaFold/UniProt lookups. This repo keeps what
  needs a JBrowse `Feature`, a session or a Mol\* plugin.

## Coordinates

- `pxToBp(...).coord` is **1-based**; take `coord0` (on every supported host) or
  subtract 1 for a 0-based base. `bpToPx({coord})` takes 0-based interbase, and
  `navToLocString` parses a 1-based locString.
- `g2p`, `p2g`, `p2gCodon` and `getCodonRanges` are 0-based interbase,
  half-open. Every stored or computed residue coordinate is a 0-based position.
- **`auth_seq_id` is display-only** (ruler, hover line), read through
  `residueNumber()`; Mol\* is addressed by `label_seq_id` through
  `Entity.seqIds`. `docs/residue-numbering.md` maps the four numberings.
- **Compare a genome hover's refName through `assemblyNaming`**
  (`src/ProteinView/util.ts`), built from the connected view's assembly, and
  gate on its `assemblyName`: `session.hovered` carries the assembly's canonical
  name (`1`) while a transcript's `g2p` keys on the annotation file's (`chr1`),
  and a raw comparison lights nothing with no error.

## Checking in a browser

- **Serve a local build through CDP `Fetch.enable` scoped to
  `*jbrowse-plugin-protein3d*`** (copy `serveCandidateBundle` from
  `scripts/check-demos.mjs`). `setRequestInterception(true)` leaves the host on
  an empty session with a clean console.
- **Give headless Chrome an ordinary user agent** (`launchBrowser` in
  `test/setup.ts`): EBI's proteins API drops `HeadlessChrome`, which reads as a
  CORS failure of the Antigen track.
- Keep vitest's console unsilenced: the suite is quiet because every line it
  used to print is gone or expected by name, so a stray line is a finding.

## Installs

- **When `tsc` cannot resolve `@jbrowse/*` after an install, check the release's
  age before the diff**: pnpm's `minimumReleaseAge` holds a new release back
  while the install reports "Already up to date"
  (`agent-docs/reference/local-build.md`).
- Commit a `pnpm-workspace.yaml` that an install changed: pnpm appends a
  `minimumReleaseAgeExclude` pin for a too-new direct dependency.
