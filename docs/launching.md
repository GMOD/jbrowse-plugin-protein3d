# Launching a protein view from a URL or from code

The plugin registers a `LaunchView-ProteinView` extension point, which JBrowse
calls for every `ProteinView` entry in a
[session spec](https://jbrowse.org/jb2/docs/urlparams/#session-spec). A spec is
a _resolving_ contract: short-form props like `uniprotId` and `transcriptId`
become a structure URL, a transcript feature and an alignment sequence before
the view exists. To restore a view exactly as it was saved instead, see
[session snapshots](session-snapshots.md).

## Parameters

| Parameter                        | Required | Description                                                                       |
| -------------------------------- | -------- | --------------------------------------------------------------------------------- |
| `url`                            | Yes\*    | Structure file URL (PDB or mmCIF)                                                 |
| `uniprotId`                      | Yes\*    | UniProt accession: the AlphaFold model, or beside `url` the UniProt tracks' entry |
| `pdbId`                          | Yes\*    | RCSB entry id; derives the mmCIF `url`                                            |
| `structures`                     | Yes\*    | Several structures in one view, each `{ url \| uniprotId \| pdbId, … }`           |
| `transcriptId`                   | No       | Transcript id/name to resolve from `connectedView` (required with the short form) |
| `userProvidedTranscriptSequence` | No       | Protein sequence for alignment                                                    |
| `feature`                        | No       | Genomic feature for cross-linking                                                 |
| `connectedViewId`                | No       | ID of an existing connected LinearGenomeView                                      |
| `connectedView`                  | No       | LinearGenomeView settings (`loc`/`assembly`/`tracks`) to create and connect one   |
| `alignmentAlgorithm`             | No       | 'smith_waterman' (default) or 'needleman_wunsch'; unknown values fall back        |
| `colorScheme`                    | No       | A scheme from the view's **Color scheme** menu, e.g. 'plddt-confidence'           |
| `displayName`                    | No       | View name; defaults to the transcript and structure labels                        |
| `height`                         | No       | View height in pixels (default: 650)                                              |
| `showControls`                   | No       | Show Mol\* controls panel                                                         |
| `showHighlight`                  | No       | Show alignment highlight on structure                                             |
| `showAlignment`                  | No       | Show the pairwise alignment panel (default: true)                                 |
| `showProteinTracks`              | No       | Show the feature tracks (default: true)                                           |
| `compactTracks`                  | No       | Draw the feature tracks at reduced height (default: true)                         |
| `autoScrollAlignment`            | No       | Scroll the alignment to the hovered residue                                       |
| `zoomToBaseLevel`                | No       | Zoom to base level on click (default: true)                                       |
| `sideBySide`                     | No       | Place a `connectedView` this launch creates beside the protein view               |
| `initialTranscriptResidues`      | No       | `{ start, end }` 1-based inclusive residues of the transcript, selected on load   |
| `initialResidues`                | No       | The same by author residue numbers, the way a paper cites a site (R248 → 248)     |
| `initialSelection`               | No       | The same as a 0-based half-open position range, for callers that already have it  |

\* Provide `url` (explicit structure), **or** `uniprotId` / `pdbId` (short
form). `url` wins over both, and `uniprotId` wins over `pdbId` — the same
precedence a `structures: [...]` snapshot uses, since both go through
`resolveStructureUrl` and then the structure loader.

## A structure on its own

```
https://jbrowse.org/code/jb2/latest/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","url":"https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif"}]}
```

## A structure connected to the genome

A **connected** view links the structure to a LinearGenomeView: hovering a
variant highlights the matching residue on the structure, and clicking a residue
highlights the codon in the genome. Launching from a gene's context menu makes
that connection for you. A demo link or an embedding app builds the same
connected session declaratively, in one of two ways depending on whether a track
in the genome view already serves the transcript.

### Short form (recommended): `uniprotId` / `pdbId` + `transcriptId`

If the connected genome view serves a gene track that contains the transcript,
this is all you need — the plugin resolves the structure, the feature, and the
alignment sequence for you:

```js
const session = `spec-${JSON.stringify({
  views: [
    {
      type: 'ProteinView',
      uniprotId: 'P04637',
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

A ready-to-open URL against the public hg38 instance:

```
https://jbrowse.org/code/jb2/latest/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","uniprotId":"P04637","transcriptId":"NM_000546.6","connectedView":{"assembly":"hg38","loc":"chr17:7,668,421-7,687,550","tracks":["hg38-ncbiRefSeqCurated","hg38-clinvarMain"]}}]}
```

To open an **experimental** structure instead of an AlphaFold model, swap
`uniprotId` for `pdbId`:

```
https://jbrowse.org/code/jb2/latest/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","pdbId":"1TUP","transcriptId":"NM_000546.6","connectedView":{"assembly":"hg38","loc":"chr17:7,668,421-7,687,550","tracks":["hg38-ncbiRefSeqCurated","hg38-clinvarMain"]}}]}
```

1TUP is p53's core domain bound to DNA: entities [0] and [1] are the DNA strands
and the protein is entity [2], so it exercises `chooseMappedEntity`, and its
chain starts at UniProt residue 94, so it exercises the SIFTS offset that places
the UniProt feature tracks. [demos.md](demos.md) collects more structures like
it, and [harness/](../harness/) runs the mapping on them in isolation.

`transcriptId` works with a plain `url` too, which is how a link opens a
structure you predicted yourself: see
[your own structures](your-own-structures.md).

Given `transcriptId`, the plugin:

- derives the structure URL from `uniprotId` (whichever model AlphaFold DB's
  prediction API names for the transcript) or `pdbId` (`<pdbId>.cif` from RCSB),
  unless `url` is given,
- fetches features at `loc` from the `connectedView` `tracks` and picks the
  transcript whose id or name matches `transcriptId` (trailing version optional,
  so `NM_000546` matches `NM_000546.6`),
- translates that transcript's CDS against the connected assembly to build the
  alignment sequence.

If any step fails (no structure for that id, transcript not found at that locus,
transcript has no CDS, or it can't be translated), the plugin aborts the launch
with an on-screen error rather than leaving a half-wired structure, so a typo in
`transcriptId` is visible, not silent.

> The matched transcript must be present in one of the `tracks` at `loc`. If it
> isn't (a custom isoform, or a track that isn't loaded), use the explicit form.

### Explicit form: `url` + `feature` + `userProvidedTranscriptSequence`

Spell out the three inputs the genome↔protein mapping needs. Use this for
hand-crafted links where no loaded track holds the transcript, or when an
embedding app already holds the data:

```js
const session = `spec-${JSON.stringify({
  views: [
    {
      type: 'ProteinView',
      url: 'https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif',
      // the transcript's translation, aligned to the structure's sequence
      userProvidedTranscriptSequence: 'MEEPQSDPSVEPPLSQETFSDLWKLLPENN...',
      feature: transcriptFeature, // see "Feature shape" below
      connectedView: {
        assembly: 'hg38',
        loc: 'chr17:7,668,421-7,687,550',
        tracks: ['ncbiRefSeqCurated', 'clinvar'],
      },
    },
  ],
})}`
```

In both forms `connectedView` takes the settings of a `LinearGenomeView` session
spec entry — `loc`, `assembly` and `tracks`, where `tracks` is a list of
trackIds (or `{ trackId, displaySnapshot }` objects) that must exist in the
target config. Write them flat, as shown. JBrowse 4 nested these settings under
an `init` key and JBrowse 5 deprecates that nesting; the plugin applies them to
whichever host it runs on, so a spec needs no `init` of its own.

### Several structures in one launch

`structures` opens one view holding several structures, superposed with TM-align
and each mapped to the same transcript — what the view's **Add structure...**
dialog builds by hand. Each entry takes `url`, `uniprotId` or `pdbId`, and may
carry its own `initialTranscriptResidues`, `initialResidues` or
`initialSelection`, a `mappedEntityId`, and a `feature` and
`userProvidedTranscriptSequence` of its own where the launch-wide ones do not
apply. The top-level `url`/`uniprotId`/`pdbId` is the one-structure shorthand
for it. [Residue numbering](residue-numbering.md) covers how a residue number in
a spec becomes a position in the file.

```
https://jbrowse.org/code/jb2/latest/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","structures":[{"uniprotId":"P04637"},{"pdbId":"1TUP"}],"transcriptId":"NM_000546.6","connectedView":{"assembly":"hg38","loc":"chr17:7,668,421-7,687,550","tracks":["hg38-ncbiRefSeqCurated","hg38-clinvarMain"]}}]}
```

## Feature shape

`feature` is a serialized transcript, the shape a JBrowse feature's `.toJSON()`
produces. The genome↔protein mapping reads its `strand` and its `CDS`
subfeatures (absolute, 0-based half-open coordinates, with `phase`), so a
minimal `feature` looks like:

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

Each codon maps to one residue, and the mapping skips intronic and UTR positions
and ignores exon subfeatures.

## From code

The same arguments go to the extension point directly:

```typescript
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

The launch is async and notifies the session on failure rather than throwing.
`pnpm test:docs` opens the standalone and connected specs above in a headless
browser, and the `Daily` workflow runs it, so a dead AlphaFold URL or a broken
launch path shows up as a failed nightly.
