## LaunchView-ProteinView extension point

This plugin registers a `LaunchView-ProteinView` extension point that allows
programmatic launching of a ProteinView. This can be used via the JBrowse 2
session spec URL parameters (see
https://jbrowse.org/jb2/docs/urlparams/#session-spec).

### Parameters

| Parameter                        | Required | Description                                                                     |
| -------------------------------- | -------- | ------------------------------------------------------------------------------- |
| `url`                            | Yes      | Structure file URL (PDB, mmCIF, etc.)                                           |
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

### URL example

Open a structure on its own (no genome connection):

```
https://jbrowse.org/code/jb2/latest/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","url":"https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif"}]}
```

### Connected genome + protein view

Normally the connection is made for you when you launch the viewer from a gene
(the clicked transcript becomes `feature` and the view you launched from becomes
`connectedViewId`). To build the same connected session **declaratively** — e.g.
for a demo link or an embedded app — pass `connectedView` instead of
`connectedViewId`. The plugin then creates the LinearGenomeView and wires the
connection itself, so a single spec entry yields a linked genome + structure
where hovering a variant highlights the residue (and vice versa):

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

`connectedView` accepts the same `init` keys as a `LinearGenomeView` spec
(`loc`, `assembly`, `tracks`); `tracks` is a list of trackIds (or
`{ trackId, displaySnapshot }` objects) that must exist in the target config.

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
```

### Testing these examples

`pnpm test:docs` opens the standalone and connected specs above in a headless
browser and asserts they render (structure extracted, `connectedView` wires the
genome view, genome→protein mapping built, tracks rendered, no console errors).
It auto-starts `pnpm start` if a dev server isn't already running on :9000.
