# Launch parameters

Every argument the `LaunchView-ProteinView` extension point takes, in a session
spec entry or from code. [Launching](launching.md) walks through them with
working links.

## Arguments

| Parameter                        | Required | Description                                                                            |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `url`                            | Yes\*    | Structure file URL (PDB or mmCIF)                                                      |
| `data`                           | Yes\*    | The structure file's text, inline, for a structure no url serves                       |
| `uniprotId`                      | Yes\*    | UniProt accession: the AlphaFold model, or beside `url` the UniProt tracks' entry      |
| `pdbId`                          | Yes\*    | RCSB entry id; derives the mmCIF `url`                                                 |
| `structures`                     | Yes\*    | Several structures in one view; see [below](#structures)                               |
| `gene`                           | Yes\*    | Gene name, found through the assembly's text search index; enough on its own           |
| `transcriptId`                   | No       | Transcript id/name to resolve from `connectedView` (required with the short form)      |
| `userProvidedTranscriptSequence` | No       | Protein sequence for alignment                                                         |
| `feature`                        | No       | Genomic feature for cross-linking                                                      |
| `connectedViewId`                | No       | ID of an existing connected LinearGenomeView                                           |
| `connectedView`                  | No       | LinearGenomeView settings (`loc`/`assembly`/`tracks`) to create and connect one        |
| `alignmentAlgorithm`             | No       | 'smith_waterman' (default) or 'needleman_wunsch'; unknown values fall back             |
| `colorScheme`                    | No       | A scheme from the view's **Color scheme** menu, e.g. 'plddt-confidence'                |
| `displayName`                    | No       | View name; defaults to the transcript and structure labels                             |
| `height`                         | No       | View height in pixels (default: 650)                                                   |
| `showControls`                   | No       | Show Mol\* controls panel                                                              |
| `showHighlight`                  | No       | Mark the aligned residues on the structure and in the alignment panel †                |
| `showAlignment`                  | No       | Show the pairwise alignment panel (default: true)                                      |
| `showProteinTracks`              | No       | Show the feature tracks (default: true) ‡                                              |
| `compactTracks`                  | No       | Draw the feature tracks at reduced height (default: true) ‡                            |
| `trackHeight`                    | No       | Height in px of one feature-track lane, 2 to 40, overriding `compactTracks` ‡          |
| `showAllFeatureTracks`           | No       | Also draw the minor UniProt types and the hydrophobicity track ‡                       |
| `autoScrollAlignment`            | No       | Scroll the alignment to the hovered residue ‡                                          |
| `zoomToBaseLevel`                | No       | Zoom to base level on click (default: true)                                            |
| `sideBySide`                     | No       | Place a `connectedView` this launch creates beside the protein view                    |
| `initialTranscriptResidues`      | No       | `{ start, end }` or an array of them: 1-based transcript residues lit on load          |
| `initialResidues`                | No       | The same by author residue numbers, the way a paper cites a site (R248 → 248)          |
| `initialSelection`               | No       | The same as 0-based half-open position ranges, for callers that already have them      |
| `mappedEntityId`                 | No       | mmCIF entity id the transcript maps to; chosen by alignment when absent                |
| `pairwiseAlignment`              | No       | `{ consensus, alns: [{ id, seq }, { id, seq }] }`, transcript row first, used as given |
| `alignmentImported`              | No       | Whether `pairwiseAlignment` is used exactly as given; true when one is present         |
| `hidden`                         | No       | Leave the structure out of the 3D canvas; it stays mapped and superposed               |

\* Provide `gene` alone, a structure (`url`, `data`, `uniprotId`, `pdbId` or
`structures`), or both. `gene` finds the transcript, the AlphaFold model and the
genome view itself, and takes any of the others as an override. Without `gene`,
`transcriptId` and a `connectedView` link the structure to the genome.

## Which source a structure opens

A structure naming more than one source opens the first of these it has, and
says nothing about the rest:

1. `data`, read as given; a `url` beside `data` is not fetched.
2. `url`.
3. `uniprotId`: the model AlphaFold DB's prediction API names for the accession.
4. `pdbId`: `<pdbId>.cif` from RCSB.

A `structures: [...]` session snapshot follows the same order, since both go
through `resolveStructureUrl` and then the structure loader.

`uniprotId` beside a `url` names the entry the UniProt feature tracks come from,
unless the `url` is in the PDB archive (RCSB or PDBe). For a PDB entry, by
`pdbId` or by such a `url`, SIFTS names the UniProt entry and sets the residue
numbering, and a `uniprotId` beside it changes neither. See
[residue numbering](residue-numbering.md).

## `structures`

Each entry of `structures` is one structure: a source (`url`, `data`,
`uniprotId` or `pdbId`) and, optionally, `initialTranscriptResidues`,
`initialResidues`, `initialSelection`, `mappedEntityId`, `pairwiseAlignment`,
`alignmentImported` and `hidden`. `feature`, `userProvidedTranscriptSequence`
and `connectedViewId` written on the launch are the defaults every entry shares,
and an entry may carry its own.

Written on the launch itself, the per-structure keys describe its one structure.
Beside `structures` they apply to no structure, so the launch reports each by
name and ignores it; put a selection on the entry it selects in. The exception
is `uniprotId` beside `gene`, which still chooses the entry the gene lookup
picks an isoform against.

The launch reports, as a warning naming the entry, an entry with an unknown key
(`structures[1] ignored unknown key(s): ulr`), a value of the wrong type, and an
entry naming no source. The launch drops what it reports and opens the rest; it
fails only when no structure is left and no `gene` supplies one.

† `showHighlight` selects every aligned residue on the structure and bands the
matching columns in the alignment panel. A selection made afterwards replaces
the highlight on the structure.

‡ `showProteinTracks` and `autoScrollAlignment` act inside the alignment panel,
so each needs `showAlignment`. `showAllFeatureTracks`, `compactTracks` and
`trackHeight` change the feature tracks, so each needs `showAlignment` and
`showProteinTracks`. The view clamps a `trackHeight` outside 2 to 40 px to the
nearer limit.

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

Write them flat, as shown; JBrowse 5 deprecates nesting them under `init`.

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
