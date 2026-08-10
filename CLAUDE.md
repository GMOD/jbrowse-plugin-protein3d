# jbrowse-plugin-protein3d

A JBrowse plugin that opens a molstar protein view from a genomic feature. Most
of what is hard here is a seam — between molstar's idea of a sequence and ours,
and between JBrowse host versions.

## Molstar: the wrong parser fails silently in one direction

Handing molstar the wrong trajectory parser fails asymmetrically:

- **PDB text parsed as `mmcif`** throws in the tokenizer (`Unexpected token.
  Expected data_, loop_, or data name.`). Loud, easy to spot.
- **mmCIF text parsed as `pdb` does not throw.** A real RCSB `.cif` read as PDB
  produced a model with ~5800 misread atoms and **zero polymer entities**; a
  short one produced a trajectory with `frameCount === 0`. Either way the view
  loads with no sequence, no alignment and no genome mapping, and nothing reports
  an error.

That second case is easy to reintroduce, because `addStructureFromData` has to
guess — an inline `data` snapshot has no filename. Detection therefore sniffs
**content** (first non-comment line starting with `data_` ⇒ mmCIF) rather than
trusting a name, and lives in `src/ProteinView/structureFormat.ts` as the default
for both `addStructureFromURL` and `addStructureFromData`. Do not re-add
per-caller detection; that was the bug this replaced.

## Molstar: `structurePosition + 1 === label_seq_id` only sometimes

Molstar builds a polymer entity's sequence two ways, and which one you get
decides whether that identity holds:

- **`entity_poly_seq` present** → `Sequence.ofResidueNames(mon_id, num)` over the
  full SEQRES. `num` is 1..N contiguous, so index `i` has `seqId === i + 1`. True
  for all RCSB mmCIF, all AlphaFold, and PDB-format files carrying SEQRES records
  (molstar synthesizes the category from them — verified on 1TUP.pdb and
  6VXX.pdb).
- **No `entity_poly_seq`** → `StructureSequence.fromHierarchy` windows
  `label_seq_id` over only the **observed** residues. A SEQRES-less PDB numbered
  from author residue 94 reports seqIds 94.., and an unobserved loop leaves a
  hole — so the offset is not even constant.

The second case reaches users through the "Open file manually" tab (trimmed or
modeling-tool output usually has no SEQRES) and through `caCoordsToPdb`, which
emits no SEQRES and survives only because it happens to number from 1. Source of
truth is molstar's `mol-model-formats/structure/basic/sequence`.

## Coordinate conventions, the off-by-one source here

- `pxToBp(...).coord` (hover) is **1-based** display; subtract 1 for a 0-based
  genome base. Newer `@jbrowse/core` also exposes `coord0`, the 0-based interbase
  sibling that round-trips with `bpToPx` — but this plugin builds against the
  **published** core, so only migrate the `coord - 1` sites once a release ships
  it.
- `bpToPx({coord})` takes **0-based** interbase.
- `navToLocString("ref:start-end")` parses a **1-based** locString.
- `g2p_mapper` (`g2p`/`p2g`/`p2gCodon`/`getCodonRanges`) is entirely **0-based
  interbase**, half-open.

## Host compatibility

**The canvas context-menu API is `main`-only.** `contextMenuInfo`, `isGeneLike`
and `fetchFullFeature` do not exist at `v4.3.0`, where `LinearBasicDisplay` still
lives in `plugins/linear-genome-view` with the synchronous `contextMenuFeature`.
A plugin that reads only the new shape shows **no menu item at all** on every
host in the wild, and **fails silently** — the gate is merely falsy, nothing
throws, so a compat typecheck stays green and no canary fires. Only a
released-host e2e leg asserting the item is present catches it. (msaview shipped
exactly this regression in v2.7.0/v2.7.1.) This plugin resolves both shapes to
one `MenuTarget` in `src/LaunchProteinView/index.ts`; which property is present
*is* the version check. Keep both.

**The CDS truncation is fixed upstream — take the `fetchFullFeature` route and
it cannot come back.** It was real: measured 2026-08-01 on the E2E fixture
(GENCODE v44, NRAS ENST00000369535.5), a host handed over a transcript whose
`CDS` was reduced to a single record while all 7 exons survived, giving 40aa and
120 mapped positions against a 189-residue structure, where v3.7.0 resolved all
4 CDS → 190aa and 570 positions.

The cause was **not** block clipping and not anything in this plugin. GENCODE
gives every segment of a multi-segment CDS **the same `ID`**
(`ID=CDS:ENST00000369535.5` on all four lines) while each exon gets a unique one
(`ID=exon:…:1..7`) — that asymmetry is the whole tell. A parser that treats the
GFF3 `ID` as a unique key keeps one CDS and drops the continuation lines, and
leaves the exons alone. `gff-nostream` now registers the id once but still
attaches every line to its parent, and jbrowse-components pins that behaviour
with `keeps every segment of a CDS that shares one ID across lines` in both
`Gff3Adapter` and `Gff3TabixAdapter`. Verified 2026-08-10 against the live
`gencode.v44.annotation.sorted.gff3.gz`: the adapter returns 4 CDS, 570 bp,
190aa.

**Which hosts are affected, exactly** — bisected against the real records
2026-08-10, so the e2e legs' differing answers are expected rather than a bug
here. Only **gff-nostream 3.0.6 – 3.0.9** truncate (published 2026-05-18 to
2026-06-01); 3.0.5 and earlier are fine, 1.3.9 is fine, 3.0.10+ is fine.
`@jbrowse/plugin-gff3@4.3.0` was published 2026-05-21 declaring `^3.0.5`, which
resolved to 3.0.9 that day — so **the prebuilt v4.3.0 host bundles the bug and
always will**, and its leg legitimately reports 40aa. v3.7.0 declared `^1.3.3`
and reports 190aa. A host built from current main reports 190aa. So a leg
disagreeing across those three is the dependency's history showing through, not
a regression in this plugin.

What is left is not truncation but **architecture**, and it is why
`fetchFullFeature` matters. On canvas hosts the render payload is typed arrays
and hit-detection items — there are no `Feature` objects in it at all, so a
plugin reading render data has no CDS to find, by design.
`fetchFullFeature(parentId, displayedRegionIndex)` re-queries the adapter
(`GetCanvasFeatureDetails` → `getFeaturesArray`) and returns the complete
feature. `resolveTarget` in `src/LaunchProteinView/index.ts` already prefers that
path and falls back to `contextMenuFeature` only on legacy hosts — so the short
alignment can only reappear on an old host, where it is unfixable from here.

Still: don't pin exact mapping counts in tests across hosts.

**A red nightly leg is usually upstream churn, not your diff.** `jbrowse create
--nightly` fetches a zip that is rebuilt without notice, and `pretest` only
creates `.test-jbrowse-nightly` when it is *missing* — so a local copy is frozen
at whatever `main` was the day it was made while CI downloads a fresh one every
run. Check `stat .test-jbrowse-nightly/index.html` before theorizing, then
`rm -rf` and recreate to reproduce. `curl -sI` the zip url to date what CI got;
it has flipped mid-run. The **released-host legs are the ones that mean a user is
affected**.

## `pnpm build` does not work locally, and that is expected

`node_modules/@jbrowse/` only contains `mobx-state-tree`: the npm `@jbrowse/core`
/ `app-core` / `plugin-linear-genome-view` are gated out by pnpm's
**minimumReleaseAge** policy (see `minimumReleaseAgeExclude` in
`pnpm-workspace.yaml`; the main setting is global), so `pnpm install
--frozen-lockfile` says "Already up to date" and never materializes them. CI has
no such gating, so its build job works.

Don't rely on a local `pnpm build` or full `tsc`. The dev harness builds anyway,
because vite/esbuild only needs runtime modules and the `@jbrowse/core` import in
`mappings.ts` is type-only. To build locally you would have to bypass
minimumReleaseAge or link `@jbrowse/*` to a local `~/src/jbrowse-components`
workspace.
