# Per-residue values: color a structure by data

The view's `color` takes two fields that paint any number onto a residue. Both
follow the live model: a new track, stat or scale recolors the structure.

- **In:** a genome track, or numbers a session gives per residue
- **Out:** the cartoon colored by one value per residue, with a legend

## `track`: a genome track under each codon

```jsonc
{
  "type": "ProteinView",
  "structures": [
    {
      "pdbId": "1t15",
      "feature": {/* transcript */},
      "connectedViewId": "lgv-1",
    },
  ],
  "color": {
    "field": "track",
    "trackId": "brca1-sge-residue-mean",
    "stat": "mean", // mean | max | min over the codon's three bases
    "scale": "threshold",
    "domain": [-1.328, -0.748],
    "range": ["#d7191c", "#fdae61", "#abd9e9"],
    "labels": ["abnormal", "intermediate", "normal"],
    "title": "BRCA1 SGE residue mean",
  },
}
```

- The track is any session or config track on the genome view's assembly: a
  bigWig or bedGraph, or a feature track whose features carry a `score`. Where
  features overlap a base, the highest score counts.
- A residue none of whose bases has a score stays grey.
- `scale: "linear"` is the default: light to dark over the 2nd to 98th
  percentile of the scores. `domainMin`, `domainMax`, `domainMid` and `range`
  override it, each end independently.
- `scale: "threshold"` needs `domain` (ascending cuts) and `range` (one color
  more than cuts). A score on a cut takes the interval above.
- The menu entry **Genome track...** in the header's palette menu sets the same
  object.

### Worked example: BRCA1 saturation genome editing

`BRCA1.sge.residue_mean.bw` carries each residue's mean missense score on all
three of its codon bases, loss of function negative. Add it as a session track
and color 1T15 by the published cuts:

```jsonc
{
  "sessionTracks": [
    {
      "type": "QuantitativeTrack",
      "trackId": "brca1-sge-residue-mean",
      "name": "BRCA1 SGE residue mean",
      "assemblyNames": ["hg38"],
      "adapter": {
        "type": "BigWigAdapter",
        "uri": "https://jbrowse.org/demos/brca1/BRCA1.sge.residue_mean.bw",
      },
    },
  ],
}
```

Against NM_007294.4 the track places 325 residues, 210 of them on 1T15 chain A.
R1699 (-1.77), A1708 (-1.43) and S1655 (-1.53) fall below -1.328 and draw red;
M1775 (-0.82) draws orange.

## `values`: numbers in the session

```jsonc
{ "color": { "field": "values", "values": { "248": -2.1, "273": -1.8 } } }
```

`values` is a list (entry `i` is residue `i + 1`) or an object keyed by residue
number. Residues count on the transcript's protein. The scale options are
`track`'s.
