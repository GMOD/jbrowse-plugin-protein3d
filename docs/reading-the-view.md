# Reading what a view resolved

A launch makes choices nobody wrote down: which chain the transcript maps to,
how well it aligns, which residues a fusion partner took. The header shows them
to a reader; a script or an agent reads the same things off the view model.

- **In:** an open ProteinView, from `session.views` or `jb.view(viewId)`
- **Out:** plain data: what each structure resolved to, and which residue a
  codon makes, in every numbering

The examples are read off TP53 (ENST00000269305.9) beside 1TUP on hg38, the e2e
leg `opens several structures from one spec`, which asserts them.

## `view.report`

```js
await jb.waitReady(60000)
const view = jb.view(viewId)
return view.report
```

```jsonc
{
  "loading": false,
  "notices": [],
  "structures": [
    {
      "label": "1TUP",
      "source": "pdb",
      "url": "https://files.rcsb.org/download/1TUP.cif",
      "pdbId": "1tup",
      "uniprotId": "P04637",
      "transcript": "ENST00000269305.9",
      "hidden": false,
      "loading": false,
      "mapping": {
        "entityId": "3",
        "chains": ["A", "B", "C"],
        "aligned": 219,
        "identical": 219,
        "transcriptLength": 393,
        "structureLength": 219,
        "identity": 1,
        "identityOverShorter": 1,
        "structureCoverage": 1,
        "transcriptStart": 94,
        "transcriptEnd": 312,
        "lowSimilarity": false,
        "exactMatch": false,
        "imported": false,
        "fusionPartnerResiduesUnmapped": 0,
      },
    },
  ],
}
```

- `loading` is the view's ready marker: true while a structure loads, aligns,
  waits on RCSB, or a color is still being painted.
- `error` is set only when the view cannot draw at all (Mol\* failed to start).
- `notices` lists what failed and left the view working, the same messages the
  banner shows: a superposition, a recolor, a navigation, a stored alignment
  that no longer matched its chain and was recomputed. A notice does not end
  `loading`, so a capture still waits for the work the notice describes.
- Each structure's `error` is a load that failed; `status` is the line beside
  its label, such as a color field that leaves it grey.
- `mapping` is absent until the alignment settles, and for a structure opened
  without a transcript. Its numbers are p2s_mapper's `alignmentQuality`, and
  `lowSimilarity` is the verdict behind the header's warning chip.
  `fusionPartnerResiduesUnmapped` counts residues the alignment paired but RCSB
  assigns to a protein fused to the transcript's, which the view unmaps.

## Locating a residue

`structure.locateResidues(target)` takes the selection forms a spec takes and
answers each residue in every numbering:

```js
const [tup] = jb.view(viewId).structures
return tup.locateResidues({ residues: { start: 248, end: 248 } })
```

```jsonc
[
  {
    "position": 154,
    "residue": 248,
    "labelSeqId": 155,
    "chains": ["A", "B", "C"],
    "structureLetter": "R",
    "transcriptResidue": 248,
    "transcriptLetter": "R",
    "codon": { "refName": "chr17", "start": 7674218, "end": 7674221 },
    "locus": "chr17:7674219-7674221",
  },
]
```

- `residues` is author numbering, the way a paper cites a site;
  `transcriptResidues` is 1-based on the transcript's translation; `positions`
  is 0-based on the structure's sequence.
- The answer is undefined while the structure is loading (`report`'s `loading`):
  its chain, its alignment and the unmapping of a fusion partner can all still
  change it.
- `codon` is 0-based half-open on the transcript's own refName, its outer bounds
  when an intron splits it; `locus` is the same codon as a 1-based locString,
  for `navToLocString`.

`structure.locateGenomeRegion({ refName, start, end })` goes the other way: each
transcript residue whose codon overlaps a 0-based half-open region, in
transcript order, or undefined while the structure is loading. The refName may
be any alias the connected genome view's assembly knows; without a connected
view it has to match the transcript's own spelling. A residue the structure
lacks keeps its transcript fields and has no structure fields, so "the crystal
does not hold this codon" is an answer rather than an empty list.
`view.locateGenomeRegion(region)` asks every structure of the view.

The lookups are p2s_mapper's `locateStructureResidue`, `locateTranscriptResidue`
and `locateGenomeBase`, which work without a browser from a mapped entity, an
alignment and g2p_mapper's genome mapping.

## Changing what the view draws

To change what the view draws rather than read it, `view.applyFigure` sets the
camera, marks, distances, surface and style, and `view.currentCamera()` reads
the camera back; see [figure session properties](figure-sessions.md).
