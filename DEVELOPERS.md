## Declarative view setup

There are two declarative ways to open a ProteinView, and they differ in how
much the plugin resolves for you:

- **`LaunchView-ProteinView` extension point** (`session=spec-{…}` URL params) —
  a _resolving_ contract: short-form props like `uniprotId`/`transcriptId` are
  turned into a structure URL, a transcript feature, and an alignment sequence
  before the view is created. Documented below.
- **Full session snapshot** (`buildSessionUrl`-style deflated `session=`, or a
  `defaultSession`) — the view hydrates _directly_ from its own model
  properties, all set at the **top level** of the view object. This is what the
  gene-explorer (`react-msaview/website`) and `jb2hubs` apps emit.

### Top-level snapshot shape (no `init`)

Unlike `LinearGenomeView`, **ProteinView has no `init` property**. `init` exists
only for keys that need on-attach resolution (LGV's `loc` can't become
`displayedRegions` until its assembly loads); ProteinView has none — structures
load into Mol\* reactively and the alignment/mapping derive themselves — so
every field is a plain top-level property that MST restores natively:

```jsonc
{
  "type": "ProteinView",
  "height": 500,
  "zoomToBaseLevel": false,
  "connectedMsaViewId": "msa-1", // optional MSA hover-sync link
  "structures": [
    {
      "url": "https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif",
      "connectedViewId": "lgv-1", // links to a LinearGenomeView by id
      "feature": {/* serialized transcript, see "feature shape" */},
      "userProvidedTranscriptSequence": "MEEP…", // optional; '' = use structure's own
      "initialSelection": { "start": 338, "end": 350 }, // optional pre-lit domain
    },
  ],
}
```

Cross-view wiring is by declared id (`connectedViewId`, `connectedMsaViewId`)
and a shared `feature`, so no imperative wiring code is needed. The typed spec
and its snapshot builder live in `src/ProteinView/proteinViewSpec.ts`
(`ProteinViewSpec` / `proteinViewSnapshot`) — every launch path funnels through
that one builder so they can't drift into different property subsets.

#### Structure shorthand: `uniprotId` / `pdbId`

Instead of a full `url`, a structure may give a `uniprotId` (→ AlphaFold model)
or `pdbId` (→ RCSB mmCIF); it's resolved to `url` at hydration when no
`url`/`data` is set, so you don't have to know the file-URL format:

```jsonc
{ "type": "ProteinView", "structures": [{ "uniprotId": "P04637" }] }
```

The shorthand keys are input-only (not stored — `uniprotId` stays derivable from
the resolved url) and resolve the **canonical isoform only** (`AF-<id>-F1`).
Per-isoform structures (UniProt/AlphaFold DB now publish these) are not yet
addressable via this shorthand — pass an explicit `url` for a specific isoform.
This snapshot shorthand only sets the structure; it does **not** build the
genome↔protein connection (feature/sequence) — for that use the extension
point's `uniprotId` + `transcriptId` short form below.

A structure with several polymer chains maps the transcript to the chain whose
sequence aligns best. `mappedEntityId` (an mmCIF entity id, `"1"`, `"2"`, …)
overrides that choice in a snapshot and is what the alignment panel's **Mapped
chain** picker writes, so a saved session restores the chain the user chose
along with the alignment computed against it.

Persisted UI preferences (`showAlignment`, `zoomToBaseLevel`, etc. in
localStorage) only fill settings the snapshot does not name, so an explicitly
declared value always wins over a sticky preference, even when it equals the
property default.

#### The 1D annotation view's link back to the genome

A LinearGenomeView launched as a 1D protein-annotation view carries a
`proteinLinkage` property: the `connectedViewId` of the genome view it came
from, the transcript `feature`, and the `uniprotId`. The plugin adds the
property to every LinearGenomeView, so a hand-authored snapshot can set it and
the 1D↔genome hover highlight works after a reload or from a shared session.

#### UniProt feature tracks on PDB structures

The protein feature tracks (domains, sites, variants — `useUniProtFeatures`)
need two things: the UniProt accession, and how UniProt positions line up with
the structure's own residue numbering.

- **AlphaFold models** answer both from the filename: the accession is in the
  URL, and the model _is_ the UniProt sequence, so UniProt position `p` is
  structure position `p - 1`.
- **PDB entries** answer neither. The accession isn't in the URL, and the
  deposited construct is usually a fragment, often tagged or engineered, so the
  numbering is offset — 1TUP's p53 chain starts at UniProt 94, 6VXX's spike has
  SEQRES 33 = UniProt 14. These are resolved from
  [SIFTS](https://www.ebi.ac.uk/pdbe/docs/sifts/) via PDBe's
  `mappings/uniprot/{pdbId}` API (`pdbUniProtMapping.ts`,
  `hooks/useStructureUniProt.ts`), which gives a per-segment correspondence.
  Only the segments for the entity the plugin mapped to the transcript are used
  — a heteromer maps each chain to a different accession, so the wrong one would
  annotate the wrong protein. `residue_number` in that API is the 1-based
  SEQRES/`label_seq_id` index, i.e. this plugin's structure position + 1.

A feature outside the modeled region maps to nothing and is dropped rather than
drawn at a misleading residue. A PDB id is only inferred from URLs on the PDB
archive hosts, so a user-supplied model named `1abc.cif` can't inherit that
entry's annotations.

## LaunchView-ProteinView extension point

This plugin registers a `LaunchView-ProteinView` extension point that allows
programmatic launching of a ProteinView. This can be used via the JBrowse 2
session spec URL parameters (see
https://jbrowse.org/jb2/docs/urlparams/#session-spec).

### Parameters

| Parameter                        | Required | Description                                                                       |
| -------------------------------- | -------- | --------------------------------------------------------------------------------- |
| `url`                            | Yes\*    | Structure file URL (PDB, mmCIF, etc.)                                             |
| `uniprotId`                      | Yes\*    | UniProt accession; derives the AlphaFold `url` (short form, see below)            |
| `pdbId`                          | Yes\*    | RCSB entry id; derives the mmCIF `url` (short form, see below)                    |
| `transcriptId`                   | No       | Transcript id/name to resolve from `connectedView` (required with the short form) |
| `userProvidedTranscriptSequence` | No       | Protein sequence for alignment                                                    |
| `feature`                        | No       | Genomic feature for cross-linking                                                 |
| `connectedViewId`                | No       | ID of an existing connected LinearGenomeView                                      |
| `connectedView`                  | No       | LGV init (`loc`/`assembly`/`tracks`) to create + connect a new LinearGenomeView   |
| `alignmentAlgorithm`             | No       | 'smith_waterman' (default) or 'needleman_wunsch'; unknown values fall back        |
| `displayName`                    | No       | Custom view display name                                                          |
| `height`                         | No       | View height in pixels (default: 650)                                              |
| `showControls`                   | No       | Show Mol\* controls panel                                                         |
| `showHighlight`                  | No       | Show alignment highlight on structure                                             |
| `zoomToBaseLevel`                | No       | Zoom to base level on click (default: true)                                       |

\* Provide `url` (explicit structure), **or** `uniprotId` / `pdbId` (short
form). `url` wins over both, and `uniprotId` wins over `pdbId` — the same
precedence a `structures: [...]` snapshot uses, since both go through
`resolveStructureUrl`.

### URL example

Open a structure on its own (no genome connection):

```
https://jbrowse.org/code/jb2/latest/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","url":"https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif"}]}
```

### Connected genome + protein view

A **connected** view links the structure to a LinearGenomeView: hovering a
variant highlights the matching residue on the structure, and clicking a residue
highlights the codon in the genome. Normally this connection is made for you
when you launch the viewer from a gene. To build the same connected session
**declaratively** — for a demo link or an embedded app — there are two ways,
depending on whether the transcript is already served by a track in the genome
view.

#### Short form (recommended): `uniprotId` / `pdbId` + `transcriptId`

If the connected genome view serves a gene track that contains the transcript,
this is all you need — the plugin resolves the structure, the feature, and the
alignment sequence for you:

```js
const session = `spec-${JSON.stringify({
  views: [
    {
      type: 'ProteinView',
      uniprotId: 'P04637', // -> AlphaFold AF-P04637-F1-model_v6.cif
      transcriptId: 'NM_000546.6', // resolved from a track at `loc` below
      connectedView: {
        assembly: 'hg38',
        loc: 'chr17:7,668,421-7,687,550',
        tracks: ['hg38-ncbiRefSeqCurated', 'hg38-clinvarMain'],
      },
    },
  ],
})}`
const url = `https://your-jbrowse/?config=/config.json&session=${encodeURIComponent(session)}`
```

A ready-to-open URL (against the public hg38 instance) looks like:

```
https://jbrowse.org/code/jb2/latest/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","uniprotId":"P04637","transcriptId":"NM_000546.6","connectedView":{"assembly":"hg38","loc":"chr17:7,668,421-7,687,550","tracks":["hg38-ncbiRefSeqCurated","hg38-clinvarMain"]}}]}
```

To open an **experimental** structure instead of an AlphaFold model, swap
`uniprotId` for `pdbId` — everything else is identical:

```
https://jbrowse.org/code/jb2/latest/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","pdbId":"1TUP","transcriptId":"NM_000546.6","connectedView":{"assembly":"hg38","loc":"chr17:7,668,421-7,687,550","tracks":["hg38-ncbiRefSeqCurated","hg38-clinvarMain"]}}]}
```

1TUP is p53's core domain bound to DNA: entities [0] and [1] are the DNA strands
and the protein is entity [2], so it exercises `chooseMappedEntity`, and its
chain starts at UniProt residue 94, so it exercises the SIFTS offset that places
the UniProt feature tracks. See [harness/](harness/) for more structures chosen
to exercise specific paths.

Given the short form + `transcriptId`, the plugin:

- derives the structure URL from `uniprotId` (`AF-<uniprotId>-F1-model_v6.cif`)
  or `pdbId` (`<pdbId>.cif` from RCSB),
- fetches features at `loc` from the `connectedView` `tracks` and picks the
  transcript whose id/name matches `transcriptId` (trailing version optional, so
  `NM_000546` matches `NM_000546.6`),
- translates that transcript's CDS against the connected assembly to build the
  alignment sequence.

If any step fails (no structure for that id, transcript not found at that locus,
transcript has no CDS, or it can't be translated), the launch is **aborted with
an on-screen error** rather than leaving a half-wired structure — so a typo in
`transcriptId` is visible, not silent.

> The matched transcript must actually be present in one of the `tracks` at
> `loc`. If it isn't (e.g. a custom isoform, or a track that isn't loaded), use
> the explicit form below.

#### Explicit form: `url` + `feature` + `userProvidedTranscriptSequence`

Spell out the three inputs the genome↔protein mapping needs directly. Use this
for hand-crafted links where the transcript may not live in a loaded track, or
when you already hold the data (e.g. an embedding app):

```js
const session = `spec-${JSON.stringify({
  views: [
    {
      type: 'ProteinView',
      url: 'https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif',
      // translated protein for the transcript below; aligned to the structure
      // sequence to map genome <-> residue
      userProvidedTranscriptSequence: 'MEEPQSDPSVEPPLSQETFSDLWKLLPENN...',
      feature: transcriptFeature, // see "feature shape" below
      connectedView: {
        assembly: 'hg38',
        loc: 'chr17:7,668,421-7,687,550',
        tracks: ['ncbiRefSeqCurated', 'clinvar'],
      },
    },
  ],
})}`
const url = `https://your-jbrowse/?config=/config.json&session=${encodeURIComponent(session)}`
```

In both forms, `connectedView` accepts the same `init` keys as a
`LinearGenomeView` spec (`loc`, `assembly`, `tracks`); `tracks` is a list of
trackIds (or `{ trackId, displaySnapshot }` objects) that must exist in the
target config.

#### feature shape

`feature` is a serialized transcript (the shape produced by a JBrowse feature's
`.toJSON()`). The genome↔protein mapping reads its `strand` and its `CDS`
subfeatures (absolute, 0-based half-open coordinates, with `phase`), so a
minimal connected `feature` looks like:

```json
{
  "uniqueId": "NM_000546.6",
  "refName": "chr17",
  "start": 7668420,
  "end": 7687490,
  "strand": -1,
  "type": "mRNA",
  "name": "TP53",
  "subfeatures": [
    {
      "type": "CDS",
      "refName": "chr17",
      "start": 7676520,
      "end": 7676594,
      "phase": 0
    },
    {
      "type": "CDS",
      "refName": "chr17",
      "start": 7675993,
      "end": 7676272,
      "phase": 0
    }
  ]
}
```

Each codon maps to one residue; intronic/UTR positions are skipped. Exon
(non-CDS) subfeatures are ignored by the mapping.

### Programmatic usage

```typescript
// minimal: structure only
pluginManager.evaluateExtensionPoint('LaunchView-ProteinView', {
  session,
  url: 'https://alphafold.ebi.ac.uk/files/AF-P12345-F1-model_v6.cif',
  userProvidedTranscriptSequence: 'MKTLLLTLVVV...',
  displayName: 'AlphaFold - P12345',
})

// connected: also create + link a genome view
pluginManager.evaluateExtensionPoint('LaunchView-ProteinView', {
  session,
  url: 'https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif',
  userProvidedTranscriptSequence: 'MEEPQSDPSVEPPLSQETFSDLWKLLPENN...',
  feature: transcriptFeature,
  connectedView: {
    assembly: 'hg38',
    loc: 'chr17:7,668,421-7,687,550',
    tracks: ['ncbiRefSeqCurated', 'clinvar'],
  },
})

// short form: resolve url/feature/sequence from uniprotId + transcriptId
pluginManager.evaluateExtensionPoint('LaunchView-ProteinView', {
  session,
  uniprotId: 'P04637',
  transcriptId: 'NM_000546.6',
  connectedView: {
    assembly: 'hg38',
    loc: 'chr17:7,668,421-7,687,550',
    tracks: ['ncbiRefSeqCurated', 'clinvar'],
  },
})
```

### Host version compatibility

This plugin is named by hub configs at permanent urls
(`jbrowse.org/ucsc/hg38/config.json`), which desktop installs and published
links keep opening on whatever JBrowse they have. So the published bundle has to
work on hosts much older than the one we develop against, and there are two
separate floors:

- **Loading.** The bundle externalizes every module in the `@jbrowse/core`
  ReExports list it was built against. A host missing one of them leaves
  `JBrowseExports["mod"]` undefined, the UMD global is never defined, and
  `PluginLoader`'s `Promise.all` fails the **entire session** — not just this
  view. Loading currently works back to `v2.15.0`.
- **Working.** A host API the plugin calls but an older host lacks throws at use
  time. This is the floor that actually moves, and it moves silently: a single
  `session.getTracksById()` call (added to core 2026-01) held the declarative
  launch at `v4.2.0` while the bundle loaded fine seven releases earlier.
  Reading whichever lookup the host has (`findTrackConf` in
  `resolveShortLaunch.ts`) is the pattern — feature-detect rather than assume,
  so the floor stays where the rest of the plugin already works.

`pnpm host-compat` probes the published bundle against every hosted release
(`jbrowse.org/code/jb2/<version>/`, so no `jbrowse create` per version), booting
each one with a declarative connected launch and waiting on
`[data-testid="protein-view-ready"]` — a real settled-state signal, not a fixed
delay. It reports per version whether the session survived, the global appeared,
and the view settled, with the console error when it did not.

```bash
pnpm host-compat                              # report the matrix
pnpm host-compat -- --floor v4.2.0            # exit non-zero if that host or newer fails
pnpm host-compat -- --versions v3.7.0,latest  # narrow it
```

Pass `--floor` in CI so a release that raises the floor fails the build instead
of turning into a bug report from someone on last year's Desktop.

### Testing these examples

`pnpm test:docs` opens the standalone and connected specs above in a headless
browser and asserts they render (structure extracted, `connectedView` wires the
genome view, genome→protein mapping built, tracks rendered, no console errors).
It auto-starts `pnpm start` if a dev server isn't already running on :9000. The
`Daily` workflow runs it, so a dead AlphaFold URL or a broken launch path shows
up as a failed nightly rather than as a bug report.

### The E2E suite

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
  covering the whole translated transcript.

Hosts differ in what they hand the context menu: v3 passes the gene and the
plugin resolves the transcript itself (all four NRAS CDS records), while v4
passes a transcript reduced to a single CDS, so the same click yields a 40aa
transcript there and a 190aa one on v3. The suite asserts the mapping is
consistent with whatever transcript arrived rather than pinning a length.

#### Screenshots

The E2E suites write reference PNGs under `test-screenshots/`. A failing run's
captures go to `test-screenshots/failed/<version>/` (gitignored) instead of over
the committed references — otherwise a broken run quietly promotes pictures of
the broken app to the new baseline. puppeteer captures aren't
pixel-deterministic (antialiasing, WebGL/molstar, font hinting), so
`scripts/pngSnapshot.mjs` normalizes each capture through `pngquant --nofs` and
only overwrites a committed PNG when it differs by more than ~1% of pixels —
otherwise the existing file is left byte-for-byte intact, so unrelated runs
don't churn git. Tune the threshold with `SCREENSHOT_DIFF_RATIO` (e.g. `0` to
always rewrite, `0.05` to tolerate larger wobble). `pngquant` is optional: where
it's absent the raw PNG is used as a fallback.
