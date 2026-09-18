# Launch parameters

Every argument the `LaunchView-ProteinView` extension point takes, in a session
spec entry or from code. [Launching](launching.md) walks through them with
working links.

## Arguments

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

## `connectedView`

`connectedView` takes the settings of a `LinearGenomeView` session spec entry —
`loc`, `assembly` and `tracks`, where `tracks` is a list of trackIds (or
`{ trackId, displaySnapshot }` objects) that must exist in the target config:

```js
connectedView: {
  assembly: 'hg38',
  loc: 'chr17:7,668,421-7,687,550',
  tracks: ['hg38-ncbiRefSeqCurated'],
}
```

Write them flat, as shown. JBrowse 4 nested these settings under an `init` key
and JBrowse 5 deprecates that nesting; the plugin writes whichever shape the
host takes, so a spec needs no `init` of its own.

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
