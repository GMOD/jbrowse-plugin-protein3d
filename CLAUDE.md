# jbrowse-plugin-protein3d

A JBrowse plugin that opens a molstar protein view from a genomic feature. Most
of what is hard here is a seam — between molstar's idea of a sequence and ours,
and between JBrowse host versions.

## The mapping itself lives in p2s_mapper

Everything between a transcript's translation and a structure's residues is the
`p2s_mapper` package (`~/src/gmod/p2s_mapper`): the pairwise aligner and its
quality statistics, the coordinate maps, `chooseMappedEntity`,
`extractStructureSequences`, SIFTS, the AlphaFold/PDBe/UniProt lookups, the url
builders and `structureFormat`. It has no React, no `@jbrowse/*` and no molstar
import — a loaded Mol\* model reaches it through narrow structural interfaces —
so a change to any of those rules is made and tested there, and this repo keeps
what needs a JBrowse `Feature`, a session or a Mol\* plugin.

`p2s_mapper` is **bundled, never externalized**: it is not a `@jbrowse/core`
re-export, so `esbuild.mjs` leaves it alone and no host can drop it.

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

That second case is easy to reintroduce, because a load from inline `data` has
to guess — a snapshot has no filename. Detection therefore sniffs **content**
(first non-comment line starting with `data_` ⇒ mmCIF) rather than trusting a
name, and lives in p2s_mapper's `structureFormat.ts` as the default
`parseStructureTrajectory` applies to both data and urls, so the view, the
launch dialog and the harness all load through it. Do not re-add per-caller
detection; that was the bug this replaced. A parse that yields no frames now
throws, naming the parser, rather than loading an empty view.

## Molstar: read structures from the live state tree

`plugin.managers.structure.hierarchy` — `findStructure`, `current` and the
component refs `updateRepresentationsTheme` takes — is a snapshot Mol\*
republishes only on some state events, and on none while a data transaction is
open anywhere in the plugin. Colour, removal and superposition run the moment a
load lands, which is exactly when it can lag, so they find a structure's cell
through `structureRootCell` (the substructure-parent map, updated on every
object event) and walk the state tree from there. The tests that pin this load a
structure inside an open `dataTransaction`; through the snapshot, colour and
superposition skipped it and removal left it in place.

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

The second case reaches users through the "File or URL" tab (trimmed or
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

## The two sides of a hover name the chromosome differently

A genome hover arrives as `session.hovered.hoverPosition.refName`, which is the
**assembly's canonical name** — `1` on jbrowse.org's hg38. The transcript's
`g2p` map is keyed on the **feature's**, straight out of the annotation file —
`chr1` in GENCODE. They match only when a config happens to pair files that
agree, so any comparison between them goes through the assembly's
`getCanonicalRefName`, as `proteinToGenomeMapping`, `AddHighlightModel`,
`fetchRegionSequence` and `resolveShortLaunch` already did.

`connectedHover` compared them raw until 2026-09-14, and the gate it feeds is
load-bearing (without it the same number on another chromosome matches a key and
lights a residue for a different locus). So on every mismatched config —
including the e2e's own — pointing at a codon lit nothing at all, with no throw
and no console line. Measured 2026-09-14 by reverting the fix: 30 coding bases
hovered, zero responses. No unit fixture could see it; every one of them spells
both refNames the same way. The e2e leg that found it hovers a real session a
pixel at a time and asserts the round trip, `g2p` in and `p2gCodon` out. The 1D
protein view's `GenomeTo1DProteinHoverHighlight` made the same raw comparison
until 2026-09-25.

Every genome-hover consumer now reads names through `assemblyNaming`
(`src/ProteinView/util.ts`), built from the **connected** genome view's
assembly. It also gates `hoverPosition.assemblyName`: `session.hovered` is one
slot for every LGV in the session, synteny rows included, and hg19's `chr17` at
the same number is a different base.

Note this does **not** mean the two names should be made equal.
`hoverGenomeLocus` and `hoverGenomeHighlights` still emit the feature's `chr1`,
and both of their consumers resolve aliases; the e2e asserts coordinates rather
than refName equality for that reason.

## A 1D protein view's residue is not the transcript's

The 1D view shows a UniProt entry; the transcript it was launched from may be
another isoform. Until 2026-10-08 both hover bridges used one position for both:
on TP53's Δ133 isoform (ENST00000504937, the entry from residue 133) the R248
codon lit serine 116, and 16 of 261 residues landed right. The right-clicked
isoform is the dialog's default, so no further choice was needed to hit it, and
a Foldseek hit linked the transcript to another protein altogether.

`withProteinLinkage` aligns the two in `afterAttach` and keeps the alignment
volatile (`resolveLinkageAlignment`, over the host in `sessionLinkageHost`).
Nothing is saved: the temporary assembly fetches the entry afresh on every load,
so a stored alignment could describe a sequence the view no longer shows.
Unaligned, pending or failed, both directions light nothing. Keep
Smith-Waterman: a global alignment stretches p53β's ten private C-terminal
residues across to the entry's end.

The 1D launch strips an isoform suffix (`P04637-7`), whose UniProt GFF is a
header alone, and opens the entry. A hover names no view, so every 1D view of an
entry launched from the genome view answers, with shared codons merged.

The e2e leg `aligns a 1D protein view to its UniProt entry on the host` covers
`afterAttach` composing with the genome view's own and the sequence fetch from
the temporary assembly. NRAS's transcript is its entry, so the leg takes the
identity path: the worker alignment and a real hover on a 1D view have run on no
host.

The 1D launch hands each track's config to the view's `launchTrack` as
`inlineConf`, so the config rides on the track node and leaves with the view
(ADR-084 in jbrowse-components). Until 2026-10-08 `addSessionTrackConf` parked
about 17 configs per entry in `sessionTracks`, which the host rejects for a
temporary assembly with one console error per track, and the view opened empty.
`proteinTrackConfs` builds the configs and `ProteinAnnotationSession` has no
`addSessionTrackConf`, so the type refuses a regression. Three consequences to
keep:

- The track selector lists `session.tracks` only, so a closed 1D track cannot be
  reopened. The launch therefore opens every track.
- Every launch fetches the feature types and opens its own tracks, under ids
  prefixed with the view's id: a session tree cannot hold one trackId twice.
  Only the temporary assembly is shared, because adding it twice makes the host
  warn.
- `launchTrack`, not `showTrack`: `showTrack` returns undefined and defers when
  the display's state model is still lazy. The host snackbars a config it
  rejects and resolves undefined; the launch reports only a rejection, by track
  name, and keeps opening the rest.

The e2e leg asserts the view's tracks and an empty console once they have drawn,
and its first runs (2026-10-08) turned up two things that are not the plugin's:

- **EBI's proteins API refuses a `HeadlessChrome` user agent** with no response
  at all, which the page reports as a CORS failure of the antigen and variation
  tracks. The same fetch returns 200 under an ordinary user agent, so the e2e
  launches Chrome with one (`launchBrowser` in `test/setup.ts`). A probe that
  opens those tracks headless needs the same.
- **Closing the 1D view makes the host warn** once per display that it "is no
  longer part of a state tree … Subpath: 'configuration'", on the nightly
  (5.0.0-beta.11) and with the view idle. The leg leaves the view open. Whether
  a view of session tracks warns the same way was not measured; an inline config
  dying with its track is the likely difference, which would make it a host bug
  in the ADR-084 path.

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

## One load is one Mol\* structure per model

The `all-models` preset turns an NMR ensemble into one Mol\* structure per
model, so a structure of the view holds `molstarStructures`, all of them.
Colour, highlight and selection address every one; superposition TM-aligns the
first and moves the rest with it; removal goes by the trajectory. Until
2026-09-18 only the first was kept: a colour scheme reached 1 of 1D3Z's ten
models, and superposition, reading `hierarchy.current.structures` instead,
aligned each model separately. The e2e leg
`colours every model of an NMR ensemble` guards it. It failed once in about 35
runs, with 1 of 10 recoloured, and never under CPU throttling or delayed
replies. A hierarchy snapshot taken after the first model was built would give
exactly that, and colour no longer reads the snapshot (see the live-tree
section), but the failure was never reproduced to prove it. A repeat means the
cause was something else: treat it as a real race, not noise.

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
  `clickedStructureRanges`, the alignment maps) stays a 0-based position, and
  molstar is addressed by `label_seq_id` through `Entity.seqIds`. Unobserved
  residues borrow the nearest observed residue's offset, so a disordered loop
  keeps counting. A spec that wants to name a site the literature's way uses
  `initialResidues: { start: 248, end: 248 }` (inclusive author numbers) and the
  model resolves it to positions after the load; `initialSelection` stays the
  0-based form.

## Host compatibility

**The build is an ES module for JBrowse 5 only.** `esbuild.mjs` externalizes the
installed `@jbrowse/core` ReExports list whole and splits Mol\* into a chunk
under `dist/chunks/`, which the entry imports relative to its own url on the
page and in the RPC worker. v4 hosts never load it: the hub configs carry
`storePlugin: "Protein3d"` beside a url pinned to the 0.15.3 UMD, so a v5 host
resolves the store's ESM build and a v4 host loads a build nothing here
rebuilds.

A key the host lacks throws at its first read naming the key, and `PluginLoader`
error-pages the session, so the gate is booting on hosted `main`
(`host-compat:candidate`), not a list comparison.

**`host-compat` intercepted every request and broke what it was measuring.**
`page.setRequestInterception(true)` routes the whole page through node, and with
it on the hosts booted the config and then sat on "Select a view to launch" with
`session.views` empty and not one console message — the same url in a plain
browser opened both views. The interception is now scoped to
`*jbrowse-plugin-protein3d*` through CDP `Fetch.enable` patterns, which serves
the local dist and leaves every other request alone. It was never red: no views
meant the probe excused `viewReady` and printed `ok`, so the gate had quietly
become "the bundle evaluated". An unapplied spec is now a failure.

**`host-compat` right-clicks a gene.** Booting the bundle only proves it
evaluates, and the declarative launch enters through `LaunchView-ProteinView` —
neither touches the context menu. The leg asserts the menu carries the host's
own rows as well as ours, because a plugin that throws while contributing takes
the whole menu down and asserting only on our row calls that a missing feature.

**The e2e finds a feature by asking the host, not by pixel arithmetic.**
`openFeatureContextMenu` hovers across the track container until the display
reports `featureIdUnderMouse`, then right-clicks that point — the same hit test
the right-click itself runs. The previous version right-clicked a constant 10px
below the container top, landed one pixel past the 10px glyph row, and read
exactly like a broken menu.

**The menu fetches the whole gene.** The canvas display's render payload holds
typed arrays and hit-test items, no `Feature` objects, so `resolveTarget` hands
the dialog `fetchFullFeature(parentId, displayedRegionIndex)`, which re-queries
the adapter for every CDS record. A 40aa NRAS translation (one CDS of four) came
from `gff-nostream` 3.0.6–3.0.9 keying GENCODE's shared CDS `ID`, on main from
2026-05-19 to 2026-06-01 only; a leg reporting it today means a stale nightly
zip. Don't pin exact mapping counts in tests.

**A red nightly leg is usually upstream churn, not your diff.**
`jbrowse create --nightly` fetches a zip that is rebuilt without notice, and
`pretest` (`scripts/ensure-nightly.mjs`) refreshes `.test-jbrowse-nightly` only
once it is a week old — so a local copy can be up to seven days behind the
`main` CI downloads fresh every run. Check
`stat .test-jbrowse-nightly/index.html` before theorizing, then `rm -rf` and
recreate to reproduce. `curl -sI` the zip url to date what CI got; it has
flipped mid-run.

## What a unit test can and cannot instantiate

`model.ts` instantiates under vitest since the SvgIcon bundling installed
`@emotion/styled` (`model.test.ts` creates a view with `getSession` mocked). It
still needs a mocked session, so test the pure pieces first, each built as a
factory over a narrow host interface (`structureLoader`, `structureSuperposer`,
`lociChannel`, `frameSelection`, `connectedHover`, `viewInteractions`,
`storedSettings`), and hand them observables or a small MST stand-in.
`structureModel` instantiates inside a `types.array` under a stub parent
(`structureModel.test.ts`), with real Mol\* structures from
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
throwing inside an ErrorBoundary. None of those reach tsc, eslint or a url
check, and a suite that merely _prints_ them is betting that somebody reads the
scrollback. Nobody does — a `silent: 'passed-only'` here once hid a deprecation
warning for an afternoon before it was caught.

`GPU_NOISE` in `scripts/browserConsole.mjs`, shared with `host-compat` and
`check-demos`, is the one list of what the page is allowed to say. It tracks
`products/jbrowse-capture/src/browser.ts` in jbrowse-components, and keeps
upstream's rule that a real GPU failure (`context LOST`, `GL error`) is **not**
noise. CI has no GPU, so swiftshader narrates.

**`host-compat` gates on the same rules, and arming that found its own bug.**
The probe launched Chrome with `--use-gl=swiftshader` and no
`--enable-unsafe-swiftshader`, which is worse than no flag at all: Chrome
deprecated the automatic fallback, so Mol\* got no WebGL context on any host.
Every run printed `Error: Could not create a WebGL rendering context` and a
`reprCount` TypeError behind it, and every run still said `ok` — `viewReady`
reads the plugin's `loading` getter, which is about load and alignment, not
paint. Measured 2026-09-13; the probe now uses the e2e's plain
`--no-sandbox --disable-setuid-sandbox` and runs clean. No separate "did it
render" assertion is needed, because a missing context is a console error and a
console error is now a failure.

**A child process writing to an inherited fd bypasses all of it.**
`setupJBrowse` pipes esbuild's output for that reason and prints it only when
the build fails; anything else that spawns a process during a test needs the
same treatment.

## `pnpm build` fails locally for a day after each `@jbrowse` release

pnpm quarantines a release for **minimumReleaseAge** minutes. Read the refusal
rather than assuming the number: measured here 2026-09-16 it was exactly 24h,
pnpm's own 1440-minute default, but the same day the sibling jb2hubs checkout
refused on a 7-day cutoff, so `~/.config/pnpm/rc`'s `minimum-release-age=10080`
does reach some projects. For however long that is after `@jbrowse/core` /
`app-core` / `plugin-linear-genome-view` publish,
`pnpm install --frozen-lockfile` says "Already up to date" and never
materializes them — `node_modules/@jbrowse/` then holds `mobx-state-tree` alone
and `tsc` cannot resolve the imports. CI has no such gating, so its build job
works throughout.

`pnpm-workspace.yaml`'s `minimumReleaseAgeExclude` is the list that reliably
opts a package out, and it is why `@jbrowse/mobx-state-tree` and `p2s_mapper`
each need a pin here even though the rc exempts `@jbrowse/*` and `@gmod/*` —
that exemption did not cover an unscoped first-party package, and
`pnpm config get` reads undefined for the key in both spellings. Take the pin
seriously: with `minimumReleaseAgeStrict` false, an install that meets a too-new
**direct** dependency appends the pin itself rather than failing, so a
`pnpm-workspace.yaml` that comes back dirty from an install is pnpm's doing, and
committing it is the point.

**Once the window passes, the local build works and is worth using.** Verified
2026-08-25: `pnpm build`, `pnpm lint`, `pnpm vitest run` and
`pnpm host-compat:candidate` all pass from a cold
`pnpm install --frozen-lockfile`, which is the whole of `preversion`. So don't
read a red build as expected — check the age of the `@jbrowse` release in the
lockfile first. If you are inside the window, the dev harness still builds
(vite/esbuild only needs runtime modules and the `@jbrowse/core` import in
`mappings.ts` is type-only), and the ways out are bypassing minimumReleaseAge or
linking `@jbrowse/*` to a local `~/src/jbrowse-components` workspace.
