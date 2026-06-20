## LaunchView-ProteinView extension point

This plugin registers a `LaunchView-ProteinView` extension point that allows
programmatic launching of a ProteinView. This can be used via the JBrowse 2
session spec URL parameters (see
https://jbrowse.org/jb2/docs/urlparams/#session-spec).

### Parameters

| Parameter                        | Required | Description                                                                     |
| -------------------------------- | -------- | ------------------------------------------------------------------------------- |
| `url`                            | Yes\*    | Structure file URL (PDB, mmCIF, etc.)                                           |
| `uniprotId`                      | Yes\*    | UniProt accession; derives the AlphaFold `url` (short form, see below)          |
| `transcriptId`                   | No       | Transcript id/name to resolve from `connectedView` (required with `uniprotId`)  |
| `userProvidedTranscriptSequence` | No       | Protein sequence for alignment                                                  |
| `feature`                        | No       | Genomic feature for cross-linking                                               |
| `connectedViewId`                | No       | ID of an existing connected LinearGenomeView                                    |
| `connectedView`                  | No       | LGV init (`loc`/`assembly`/`tracks`) to create + connect a new LinearGenomeView |
| `alignmentAlgorithm`             | No       | 'emboss_matcher', 'emboss_needle', or 'emboss_water'                            |
| `displayName`                    | No       | Custom view display name                                                        |
| `height`                         | No       | View height in pixels (default: 650)                                            |
| `showControls`                   | No       | Show Mol\* controls panel                                                       |
| `showHighlight`                  | No       | Show alignment highlight on structure                                           |
| `zoomToBaseLevel`                | No       | Zoom to base level on click (default: true)                                     |

\* Provide either `url` (explicit structure) **or** `uniprotId` (short form).

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

#### Short form (recommended): `uniprotId` + `transcriptId`

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

Given `uniprotId` + `transcriptId`, the plugin:

- derives the AlphaFold structure URL from `uniprotId`
  (`AF-<uniprotId>-F1-model_v6.cif`),
- fetches features at `loc` from the `connectedView` `tracks` and picks the
  transcript whose id/name matches `transcriptId` (trailing version optional, so
  `NM_000546` matches `NM_000546.6`),
- translates that transcript's CDS against the connected assembly to build the
  alignment sequence.

If any step fails (no structure for the UniProt id, transcript not found at that
locus, transcript has no CDS, or it can't be translated), the launch is
**aborted with an on-screen error** rather than leaving a half-wired structure —
so a typo in `transcriptId` is visible, not silent.

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

### Testing these examples

`pnpm test:docs` opens the standalone and connected specs above in a headless
browser and asserts they render (structure extracted, `connectedView` wires the
genome view, genome→protein mapping built, tracks rendered, no console errors).
It auto-starts `pnpm start` if a dev server isn't already running on :9000.

#### Screenshots

The E2E suites write reference PNGs under `test-screenshots/`. puppeteer
captures aren't pixel-deterministic (antialiasing, WebGL/molstar, font hinting),
so `scripts/pngSnapshot.mjs` normalizes each capture through `pngquant --nofs`
and only overwrites a committed PNG when it differs by more than ~1% of pixels —
otherwise the existing file is left byte-for-byte intact, so unrelated runs
don't churn git. Tune the threshold with `SCREENSHOT_DIFF_RATIO` (e.g. `0` to
always rewrite, `0.05` to tolerate larger wobble). `pngquant` is optional: where
it's absent the raw PNG is used as a fallback.
