# jbrowse-plugin-protein3d

A JBrowse plugin that opens a molstar protein view from a genomic feature. Most
of what is hard here is a seam — between molstar's idea of a sequence and ours,
and between JBrowse host versions.

## Molstar: the wrong parser fails silently in one direction

Handing molstar the wrong trajectory parser fails asymmetrically:

- **PDB text parsed as `mmcif`** throws in the tokenizer
  (`Unexpected token. Expected data_, loop_, or data name.`). Loud, easy to
  spot.
- **mmCIF text parsed as `pdb` does not throw.** A real RCSB `.cif` read as PDB
  produced a model with ~5800 misread atoms and **zero polymer entities**; a
  short one produced a trajectory with `frameCount === 0`. Either way the view
  loads with no sequence, no alignment and no genome mapping, and nothing
  reports an error.

That second case is easy to reintroduce, because `addStructureFromData` has to
guess — an inline `data` snapshot has no filename. Detection therefore sniffs
**content** (first non-comment line starting with `data_` ⇒ mmCIF) rather than
trusting a name, and lives in `src/ProteinView/structureFormat.ts` as the
default for both `addStructureFromURL` and `addStructureFromData`. Do not re-add
per-caller detection; that was the bug this replaced.

## Molstar: `structurePosition + 1 === label_seq_id` only sometimes

Molstar builds a polymer entity's sequence two ways, and which one you get
decides whether that identity holds:

- **`entity_poly_seq` present** → `Sequence.ofResidueNames(mon_id, num)` over
  the full SEQRES. `num` is 1..N contiguous, so index `i` has `seqId === i + 1`.
  True for all RCSB mmCIF, all AlphaFold, and PDB-format files carrying SEQRES
  records (molstar synthesizes the category from them — verified on 1TUP.pdb and
  6VXX.pdb).
- **No `entity_poly_seq`** → `StructureSequence.fromHierarchy` windows
  `label_seq_id` over only the **observed** residues. A SEQRES-less PDB numbered
  from author residue 94 reports seqIds 94.., and an unobserved loop leaves a
  hole — so the offset is not even constant.

The second case reaches users through the "Open file manually" tab (trimmed or
modeling-tool output usually has no SEQRES) and through `caCoordsToPdb`, which
emits no SEQRES and survives only because it happens to number from 1. Source of
truth is molstar's `mol-model-formats/structure/basic/sequence`.

## Molstar: read `sequence.code`, never `sequence.label`

`label` spells a residue that has no one-letter code by its component id (MSE,
TPO, ACE) and an alternate site as `(S|P)`, so the string outgrows `seqId` and
every later position addresses the wrong residue. Until 2026-09-12 the plugin
read it: 12 of 122 entities in a 72-entry sample were shifted, among them 1H26's
phospho-CDK2, 4ZZJ's peptide (`RHKALYLNLEF` for 7 residues) and 1GZM, whose
N-terminal ACE moved the whole chain by two. Against SIFTS, disagreeing residues
went from 113 to 1,145. No test saw it, because the fixtures are RCSB's
one-letter sequences and the stubs handed `label` single letters.
`extractEntities` now reads `code` and takes parent letters from
`entity_poly.pdbx_seq_one_letter_code_can`, and matches RCSB's FASTA on all 122.

## Which chain is the gene's: identity over the shorter sequence, not matches

`chooseMappedEntity` ranks a structure's protein chains by identical residues
over the shorter of transcript and chain (`explainedFraction`), not by how many
residues match. Measured 2026-09-05 with the plugin's own aligner on real
entries: the commonest shape of a p53 PDB entry is a short p53 peptide bound to
a large partner, and a raw match count picks the partner every time the partner
is long enough. 1H26 gives CDK2 58 scattered identities against the 11-residue
peptide's 11; 4ZZJ gives SIRT1 63 against 6. The Smith-Waterman score does not
separate them either (56 vs 58). Dividing by length puts the peptides at 0.69
and 0.50, the partners at 0.19 and 0.17, and the best decoy across a ribosome's
55 chains at 0.29. Those entries are test fixtures; keep them.

Dividing by the _chain's_ length alone, as it did until 2026-09-11, penalised a
fusion construct on the correct chain: a 60-residue product on a 370-residue
carrier scored 0.14 and lost to a random 10-mer decoy a third of the time. Over
the shorter sequence a chain containing the whole transcript scores near 1
whatever its tag. `docs/genome-to-structure-alignment.md` carries the
measurements, the precedent (SIFTS and G2S are both alignment-derived), and the
cases sequence cannot decide.

Nucleic-acid chains are excluded by molstar's entity subtype rather than left to
score low, because A, C, G, T and U are amino-acid letters too. They stay in the
**Mapped chain** picker, labelled in nt, for a user who wants them.

Two things sequence scoring cannot do: tell paralogs apart in a complex, where
the picker is the way out, and keep the halves of a chimera apart. On 2RH1, the
β2-adrenergic receptor fused to T4 lysozyme, the local alignment bridges the
fusion and scatters 33 ICL3 residues onto lysozyme, so those codons hovered to a
bacterial protein. SIFTS maps each segment to its own accession, so for an RCSB
entry the model's `alignment` getter unmaps residues SIFTS gives another protein
(`fusionPartnerPositions`); 351 such residues across 70 entries went to 0 with
no correct residue lost. Which protein is the transcript's is decided by
identity over the residues each covers, not by how many it covers: a count
unmapped an 11-residue p53 peptide fused to CDK2 and kept 224 chance pairs. Read
`alignment`, not the stored `pairwiseAlignment`, anywhere a column or a
coordinate is computed: the two differ in length for a fusion.

## An MSA reaches a structure through the genome, never by column

msaview and this plugin share one coordinate: the genome. A structure hover
reaches msaview as `hoverGenomeHighlights`, and an MSA hover reaches a structure
as msaview's `connectedHoverHighlights`, the codon under the hovered column,
mapped genome → transcript → structure (`src/ProteinView/connectedHover.ts`).
They pair by sharing a `connectedViewId`, with no id naming each other.

Until 2026-09-13 a bridge matched the structure's sequence to an alignment row
and, where none matched, used the column number as a residue index. That is
every Pfam seed and every PDB fragment: in the protein browser's TP53 seed
session, hovering R248 painted a second codon 400 bp away. Don't reintroduce a
column-number path.

## Everything on one Mol\* plugin hears everything

Every structure of a view subscribes to the same plugin's interactions, and
AlphaFold models are all entity 1, so entity id cannot tell two superposed
models apart: hovering mouse residue 100 used to light human residue 100 and its
codon. `interactionPosition` checks the Mol\* model id against every model the
load created (an NMR ensemble has twenty). Mol\*'s select and highlight channels
are plugin-wide too, so `makeLociChannel` sets them for all structures at once;
set per structure, the clear before each one wiped the others' selection.

`protein-view-ready` and JBrowse's `showLoading` read one per-structure
`loading` getter: loaded into Mol\*, aligned, and SIFTS answered for a PDB
entry. The marker used to read only the alignment, which is not pending before a
structure has a sequence, so it flipped 3–6 s before the structure loaded, and
the e2e's multi-structure leg passed only because of that.

## Coordinate conventions, the off-by-one source here

- `pxToBp(...).coord` (hover) is **1-based** display; subtract 1 for a 0-based
  genome base. Newer `@jbrowse/core` also exposes `coord0`, the 0-based
  interbase sibling that round-trips with `bpToPx` — but this plugin builds
  against the **published** core, so only migrate the `coord - 1` sites once a
  release ships it.
- `bpToPx({coord})` takes **0-based** interbase.
- `navToLocString("ref:start-end")` parses a **1-based** locString.
- `g2p_mapper` (`g2p`/`p2g`/`p2gCodon`/`getCodonRanges`) is entirely **0-based
  interbase**, half-open.
- **Residue numbers the user sees are `auth_seq_id`**, the depositors'
  numbering, which for an RCSB entry is what papers and UniProt cite (1TUP
  position 154 reads 248) and what Mol\*'s own hover shows. `Entity.authSeqIds`
  carries it, `residueNumber()` reads it, and it is display-only: the ruler and
  the hover line. Every stored or computed coordinate (`initialSelection`,
  `clickedStructureRange`, the alignment maps) stays a 0-based position, and
  molstar is addressed by `label_seq_id` through `Entity.seqIds`. Unobserved
  residues borrow the nearest observed residue's offset, so a disordered loop
  keeps counting. A spec that wants to name a site the literature's way uses
  `initialResidues: { start: 248, end: 248 }` (inclusive author numbers) and the
  model resolves it to positions after the load; `initialSelection` stays the
  0-based form.

## Host compatibility

**The externals are what the oldest host re-exports, not what core does.**
`esbuild.mjs` externalizes a path only when both the installed `@jbrowse/core`
ReExports list and `scripts/host-reexports-floor.json` (v4.0.0, regenerated by
`pnpm update-host-reexports-floor`) carry it, and it always bundles
`@mui/material/SvgIcon`, whose shape differs between MUI 7 and MUI 9 hosts.
`pnpm check-host-externals` greps the built output to confirm. Before this
guard, bumping to `@mui/icons-material` 9 and `@jbrowse/core` 5 produced a
bundle that passed tsc, eslint and every unit test, and error-paged v4.0.0,
v4.3.0 and `latest` with `createSvgIcon is not a function` — the msaview 2.7.0
outage again. `host-compat:candidate` caught it. Bundling SvgIcon pulls in
`@emotion/styled`, which is why that devDependency exists.

**Building against core 5 means typing for a host most users do not run.** Where
v5's types reject the call v4 hosts need, the code keeps the v4 call and adapts
the typing: `addToExtensionPoint` rather than `contributeToExtensionPoint`,
`sessionId` inside `CoreGetFeatures` args (v4.3.0 reads it there to find the
adapter cache), and a local `SessionWithAddTracks` over `addTrackConf`, the only
method v4.3.0 sessions have.

**The canvas context-menu API is `main`-only.** `contextMenuInfo`, `isGeneLike`
and `fetchFullFeature` do not exist at `v4.3.0`, where `LinearBasicDisplay`
still lives in `plugins/linear-genome-view` with the synchronous
`contextMenuFeature`. A plugin that reads only the new shape shows **no menu
item at all** on every host in the wild, and **fails silently** — the gate is
merely falsy, nothing throws, so a compat typecheck stays green and no canary
fires. Only a released-host e2e leg asserting the item is present catches it.
(msaview shipped exactly this regression in v2.7.0/v2.7.1.) This plugin resolves
both shapes to one `MenuTarget` in `src/LaunchProteinView/index.ts`; which
property is present _is_ the version check. Keep both.

**Call a captured super view with a receiver, always.** `main`'s canvas display
writes its own contribution as `info && this.isGeneLike ? …`. Capture
`const superContextMenuItems = self.contextMenuItems` and call it bare and
`this` is undefined, so it throws before returning anything, and the
ErrorBoundary around the menu swallows the throw: the user right-clicks a
feature and gets **no menu at all** — the host's own items vanish along with
ours, which is a worse outcome than the plugin simply not contributing.
`superContextMenuItems.call(self)` is the entire fix. Nothing static sees this
one: tsc types the super as a plain `() => MenuItem[]`, and the throw needs a
host whose implementation happens to read `this`. `host-compat` did not see it
either, because it booted the bundle and never opened a menu — it does now.

jbrowse-components fixed its side the same day (`104bbfc581`, 2026-08-17: the
getter moves to an earlier `.views()` block so `self` carries it, plus a guard
that calls the view detached). Keep `.call(self)` anyway — a plugin cannot
choose which host it runs on, and every nightly zip built before that commit
still throws. The same bare call sits in **msaview, icn3d, alphagenome,
alphagenome2 and graphgenomeview**.

**`host-compat` intercepted every request and broke what it was measuring.**
`page.setRequestInterception(true)` routes the whole page through node, and with
it on, v4.3.0, latest and main booted the config and then sat on "Select a view
to launch" with `session.views` empty and not one console message — the same url
in a plain browser opened both views. Passthrough interception reproduced it, so
the candidate bundle was never the variable. The interception is now scoped to
`*jbrowse-plugin-protein3d*` through CDP `Fetch.enable` patterns, which serves
the local dist (molstar chunk included) and leaves every other request alone.

What made it expensive is that it was never red: no views meant the probe
excused `viewReady` and printed
`ok (booted; host did not apply the session spec, view not asserted)` for the
three hosts that matter, so the pre-publish gate had quietly become "the umd
evaluated". An unapplied spec is now a failure. A check that cannot tell "fine"
from "didn't look" reports both as fine.

**`host-compat` right-clicks a gene now.** Booting the bundle only proves it
evaluates, and the declarative launch enters through `LaunchView-ProteinView` —
neither touches the context menu. Both earlier outages happened at evaluation;
the 2026-08-17 one did not, and nothing on the hosted-release side would have
seen it. The leg asserts the menu carries the host's own rows as well as ours,
because a plugin that throws while contributing takes the whole menu down and
asserting only on our row calls that a missing feature. Verified by making the
contribution throw: `the feature context menu lost the host's own rows: []`,
exit 1, on v4.3.0 and main.

**Side-by-side launch works on `main` only, and that is the v4 hangover rather
than a break.** Measured 2026-08-17 on the hosted releases: `main` has
`session.setPendingMove`, so the protein view lands in a right-hand panel;
v4.3.0 and `latest` expose `setUseWorkspaces` but place views through
`setPendingMoveToSplitRight`, a module function in `@jbrowse/app-core`'s
DockviewContext, so the views stack and `sideBySide.ts` warns. Nothing on the
session distinguishes that host from a newer one that dropped the action, which
is why the warning names both and why sniffing the version to quiet it would
throw away the alarm. Wiring up v4's door would be new v4-only accommodation, so
it stays unwired.

**The e2e finds a feature by asking the host, not by pixel arithmetic.**
`openFeatureContextMenu` hovers across the track container until the display
reports `featureIdUnderMouse`, then right-clicks that point — the same hit test
the right-click itself runs, so a point that answers is a point whose menu is
the feature's. The previous version right-clicked a constant 10px below the
container top. main's glyph row is 10px tall and starts at the top, so the click
landed one pixel past its bottom edge and the leg failed with a y coordinate in
the message — a missed click that reads exactly like the genuinely broken menu
it happened to be sitting on top of.

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

**No released host was ever affected, so a released leg reporting 40aa means a
stale zip.** Bisected against the real records 2026-08-10: only **gff-nostream
3.0.6 – 3.0.9** truncate; 3.0.5 and earlier are fine, 1.3.9 is fine, 3.0.10+ is
fine. Checking the lockfiles rather than the caret ranges — which is the step
that matters, since pnpm builds from the lockfile — **`v4.3.0` shipped with
`gff-nostream@3.0.5` pinned and is clean**, and v3.7.0's `^1.3.3` is clean.
jbrowse-components `main` carried 3.0.9 for about thirteen days (2026-05-19 to
2026-06-01) and nothing else ever did.

So the only build that can show 40aa is a **nightly zip fetched during that
window** — which is precisely the frozen-`.test-jbrowse-nightly` trap below,
since `pretest` never refreshes an existing one. That is the likely source of
the 2026-08-01 measurement. If a leg reports 40aa today, date the zip before
suspecting anything else.

What is left is not truncation but **architecture**, and it is why
`fetchFullFeature` matters. On canvas hosts the render payload is typed arrays
and hit-detection items — there are no `Feature` objects in it at all, so a
plugin reading render data has no CDS to find, by design.
`fetchFullFeature(parentId, displayedRegionIndex)` re-queries the adapter
(`GetCanvasFeatureDetails` → `getFeaturesArray`) and returns the complete
feature. `resolveTarget` in `src/LaunchProteinView/index.ts` already prefers
that path and falls back to `contextMenuFeature` only on legacy hosts — so the
short alignment can only reappear on an old host, where it is unfixable from
here.

Still: don't pin exact mapping counts in tests across hosts.

**A red nightly leg is usually upstream churn, not your diff.**
`jbrowse create --nightly` fetches a zip that is rebuilt without notice, and
`pretest` only creates `.test-jbrowse-nightly` when it is _missing_ — so a local
copy is frozen at whatever `main` was the day it was made while CI downloads a
fresh one every run. Check `stat .test-jbrowse-nightly/index.html` before
theorizing, then `rm -rf` and recreate to reproduce. `curl -sI` the zip url to
date what CI got; it has flipped mid-run. The **released-host legs are the ones
that mean a user is affected**.

## What a unit test can and cannot instantiate

`model.ts` would not instantiate under vitest because `@mui/icons-material`
needs `@emotion/styled`, which was not installed. The SvgIcon bundling installs
it now, so that reason may be gone; nobody has re-checked. Test the pure pieces
instead, each built as a factory over a narrow host interface
(`structureLoader`, `structureSuperposer`, `lociChannel`, `frameSelection`,
`connectedHover`, `storedSettings`), and hand them observables or a small MST
stand-in. `structureModel` does instantiate inside a `types.array` under a stub
parent (`structureModel.test.ts`), with real Mol\* structures from
`test_data/molstarStructure.ts` rather than cast fakes.

Some conclusions those tests cannot reach, so they are not worth re-deriving:
Mol\* model ids survive superposition (`TransformStructureConformation` builds
units with `applyOperator`, which keeps `unit.model`, and symmetry assemblies do
the same); AlphaFold's `/api/sequence/summary` nests hits under
`structures[].summary` and its first p53 hit is another species, which is why
the sequence-search mode was deleted in favour of Foldseek. For what a session
does on a hosted release, see `docs/live-checks.md`.

## A quiet test run, because the console is asserted rather than ignored

`pnpm test` prints its summary and nothing else. Not because anything silences
it — there is no `silent` setting and adding one would be a mistake — but
because every line the suite used to emit is now either gone or expected by
name. A stray `console.log` still shows up, which is the point.

**The e2e fails on anything the page says at warn or error.**
`pageComplaintsSince()` drains what the browser logged, and every leg asserts it
empty. A console line is the only place several host incompatibilities have ever
appeared: a bundle resolving a re-export the host dropped, a menu contribution
throwing inside an ErrorBoundary, MUI 9's `createSvgIcon` missing from a v4
host's `SvgIcon`. None of those reach tsc, eslint or a url check, and a suite
that merely _prints_ them is betting that somebody reads the scrollback. Nobody
does — a `silent: 'passed-only'` here hid the `init` deprecation below for
exactly one afternoon before it was caught.

Two lists in `test/setup.ts` say what the page is allowed to say:

- `GPU_NOISE` tracks `products/jbrowse-capture/src/browser.ts` in
  jbrowse-components, and keeps upstream's rule that a real GPU failure
  (`context LOST`, `GL error`) is **not** noise. CI has no GPU, so swiftshader
  narrates.
- `KNOWN_DEBT` holds two entries and every entry needs an exit condition. One is
  v5's warning that `LinearGenomeView` "nests its settings under `init`":
  v4.3.0's LGV has no other door — `init: types.frozen<InitState>()` plus the
  autorun in its `afterAttach.ts` — so `addView` in
  `LaunchProteinViewExtensionPoint` has to keep writing it, and until v4 goes
  every declarative launch warns on a v5 host.

An entry can be scoped to the hosts it is true of, and the second one has to be.
`sideBySide.ts` warns that the session "supports workspaces but not
setPendingMove" on every released host, where that is a known limitation nobody
is wiring up — but the identical sentence on `main` would mean the session API
moved out from under the plugin, which is a break. Excusing it everywhere
deletes the alarm it exists to raise, so its `expectedOn` is every host but
`main`. The rules live in `scripts/browserConsole.mjs`, shared with
`host-compat`, with unit tests beside them, because a mis-scoped entry fails
open and in silence.

Verify the gate still bites before trusting it: delete the `init` entry and two
legs fail, naming the message. One is the test config's own session, the other
the view the plugin itself adds — which is how you can tell the deprecation
reaches shipped code and not just the fixture.

**`host-compat` gates on the same rules, and arming that found its own bug.**
The probe launched Chrome with `--use-gl=swiftshader` and no
`--enable-unsafe-swiftshader`, which is worse than no flag at all: Chrome
deprecated the automatic fallback, so Mol\* got no WebGL context on any host.
Every run printed `Error: Could not create a WebGL rendering context` and a
`reprCount` TypeError behind it, and every run still said `ok` — `viewReady`
reads the plugin's `loading` getter, which is about load and alignment, not
paint. Measured 2026-09-13 across v4.0.0/v4.3.0/latest/main; the probe now uses
the e2e's plain `--no-sandbox --disable-setuid-sandbox` and all four are clean.
No separate "did it render" assertion is needed, because a missing context is a
console error and a console error is now a failure.

That measurement also confirms the scoping from the other side: the side-by-side
warning appears on v4.0.0, v4.3.0 and `latest` and not on `main`, and the `init`
deprecation appears only on `main`.

**A child process writing to an inherited fd bypasses all of it.**
`setupJBrowse` pipes esbuild's output for that reason and prints it only when
the build fails; anything else that spawns a process during a test needs the
same treatment.

## `pnpm build` fails locally for a day after each `@jbrowse` release

pnpm's **minimumReleaseAge** is 1440 minutes globally (see
`minimumReleaseAgeExclude` in `pnpm-workspace.yaml` for the one pin that opts
out), so for 24 hours after `@jbrowse/core` / `app-core` /
`plugin-linear-genome-view` publish, `pnpm install --frozen-lockfile` says
"Already up to date" and never materializes them — `node_modules/@jbrowse/` then
holds `mobx-state-tree` alone and `tsc` cannot resolve the imports. CI has no
such gating, so its build job works throughout.

**Once the window passes, the local build works and is worth using.** Verified
2026-08-25 against `@jbrowse/core` 4.3.0: `pnpm build`, `pnpm lint`,
`pnpm vitest run` and `pnpm host-compat:candidate` all pass from a cold
`pnpm install --frozen-lockfile`, which is the whole of `preversion`. So don't
read a red build as expected — check the age of the `@jbrowse` release in the
lockfile first. If you are inside the window, the dev harness still builds
(vite/esbuild only needs runtime modules and the `@jbrowse/core` import in
`mappings.ts` is type-only), and the ways out are bypassing minimumReleaseAge or
linking `@jbrowse/*` to a local `~/src/jbrowse-components` workspace.
