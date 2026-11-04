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
    "stat": "mean", // mean | max | min over the codon's three bases, or count
    "scale": "threshold",
    "domain": [-1.328, -0.748],
    "range": ["#d7191c", "#fdae61", "#abd9e9"],
    "labels": ["abnormal", "intermediate", "normal"],
    "title": "BRCA1 SGE residue mean",
  },
}
```

- The track is any session or config track on the genome view's assembly: a
  bigWig or bedGraph, a feature track, or a variant track. Where features
  overlap a base, the highest score counts.
- A residue none of whose bases has a score stays grey.
- `scoreField` names what to read in place of `score`, spelled as
  jbrowse-components' variant displays name a record field: `INFO.AF`, `QUAL`,
  or `INFO.AF.1` for one allele. A VCF record has no `score`, so a variant track
  needs one, or `count`. A list, which is what a multi-allelic site's `INFO.AF`
  holds, gives its highest number, the same rule as overlapping features; a
  `jexl:` expression is refused.
- `stat: "count"` paints how many features fall on each residue's codon, and
  reads no value, so it refuses a `scoreField`. A feature counts once on every
  residue whose codon it touches: a deletion across a codon boundary changes
  both residues. A VCF indel's first base is the padding base VCF writes before
  the event, unchanged, so where every alternate allele keeps it the record
  reads from the base after, for a count and a score alike: a 1-bp deletion of a
  codon's leftmost base counts on that codon, not also on the neighbour holding
  the padding base. An insertion, whose REF is the padding base alone, counts on
  that base's residue. A residue no feature falls on reads **0**, not grey,
  because the request searched every codon of the transcript, so no feature is
  an observed zero, not a missing value.
- `filter` keeps only the features every predicate passes, for a count and a
  score alike. It is the structure `filter`'s grammar, Vega-Lite's field
  predicates, over feature fields named as `scoreField` names them:
  `{ "field": "FILTER", "equal": "PASS" }`,
  `{ "field": "INFO.AF", "gte": 0.01 }`. A predicate takes `equal`, `oneOf`,
  `lt`, `lte`, `gt`, `gte` or `range`. A list field passes `equal` and `oneOf`
  when any entry does; the bounds test the number `scoreField` would read, a
  list's highest. A feature without the field passes nothing. A `jexl:`
  expression is refused, as for `scoreField`.
- A track that leaves the structure grey says so beside the structure's label:
  no features under the transcript's coding bases at all (which a count would
  otherwise paint as all zeros, though a VCF missing the chromosome looks the
  same), features that carry no number in `score` or the named field, or
  features none of which passes `filter`.
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

### Worked example: a variant track counted per residue

A cohort VCF (Dog10K, a TCGA mutation set, gnomAD) carries no `score`. NCBI's
ClinVar VCF stands in for one here; its records name `7`, not `chr7`, which the
assembly's aliases resolve. Add it as a session track:

```jsonc
{
  "sessionTracks": [
    {
      "type": "VariantTrack",
      "trackId": "clinvar-vcf",
      "name": "ClinVar VCF",
      "assemblyNames": ["hg38"],
      "adapter": {
        "type": "VcfTabixAdapter",
        "uri": "https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz",
      },
    },
  ],
}
```

Colored by `mean`, BRAF's AlphaFold model (P15056, against ENST00000646891.2)
stays grey and its label says why:

> Track "clinvar-vcf"'s 1095 features under this transcript carry no number in
> score; name the field to read with scoreField, such as INFO.AF, or count the
> features with stat "count"

Count the records under each codon instead:

```jsonc
{
  "color": {
    "field": "track",
    "trackId": "clinvar-vcf",
    "stat": "count",
    "scale": "threshold",
    "domain": [1, 3, 10],
    "range": ["#f7f7f7", "#fcae91", "#fb6a4a", "#a50f15"],
    "labels": ["none", "1–2", "3–9", "10 or more"],
  },
}
```

On 2026-11-04 all 766 residues took a value: 213 read 0, the rest up to 14, and
V600 12. Every record counts, whatever its classification or consequence, so a
synonymous record counts as much as a missense one.

To color by a number the records carry, name it and pick how a codon reduces:

```jsonc
{
  "color": {
    "field": "track",
    "trackId": "clinvar-vcf",
    "stat": "max",
    "scoreField": "INFO.AF_EXAC",
  },
}
```

Only records ExAC saw carry `AF_EXAC`, so 113 residues take a value, up to 0.21,
and V600 reads 0.00002; the rest stay grey. The legend titles each by what a
residue shows: `ClinVar VCF (features per codon)` and
`ClinVar VCF (max INFO.AF_EXAC per codon)`.

### Worked example: counting only the calls that pass

A callset's FILTER column says which records its caller trusts, and a count
reads every record unless told otherwise. On Dog10K's slice under canine SOD1
(canFam4), 43 of the 45 records under the coding bases fail the callset's VQSR
filter; counting them paints SOD1 as far more variable than the cohort shows.
Count the passing calls alone:

```jsonc
{
  "color": {
    "field": "track",
    "trackId": "dog10k-vcf",
    "stat": "count",
    "filter": [{ "field": "FILTER", "equal": "PASS" }],
  },
}
```

A VCF record's FILTER reaches the plugin as the string `PASS` when the record
passed, as a list of the filters it failed otherwise
(`["VQSRTrancheSNP99.00to99.90"]`), and not at all when the column is `.`. So
`equal: "PASS"` keeps the passing records, `oneOf: ["PASS", "LowQual"]` also any
record whose failed filters include `LowQual`, and a callset that never applied
filters writes `.` everywhere and passes nothing: the label then says no feature
passed. The legend names the filter, for a track named `Dog10K VCF`:
`Dog10K VCF (features per codon where FILTER = PASS)`.

## `values`: numbers in the session

```jsonc
{ "color": { "field": "values", "values": { "248": -2.1, "273": -1.8 } } }
```

`values` is a list (entry `i` is residue `i + 1`) or an object keyed by residue
number. Residues count on the transcript's protein. The scale options are
`track`'s.
