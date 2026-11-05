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
| `alphaFoldComplexId`             | Yes\*    | AlphaFold DB complex model id, `AF-0000000066211449`; see [below](#complexes)          |
| `pdbId`                          | Yes\*    | RCSB entry id; derives the mmCIF `url`                                                 |
| `structures`                     | Yes\*    | Several structures in one view; see [below](#structures)                               |
| `gene`                           | Yes\*    | Gene name, found through the assembly's text search index; enough on its own           |
| `transcriptId`                   | No       | Transcript id/name to resolve from `connectedView` (required with the short form)      |
| `userProvidedTranscriptSequence` | No       | Protein sequence for alignment                                                         |
| `feature`                        | No       | Genomic feature for cross-linking                                                      |
| `connectedViewId`                | No       | ID of an existing connected LinearGenomeView                                           |
| `connectedView`                  | No       | LinearGenomeView settings (`loc`/`assembly`/`tracks`) to create and connect one        |
| `alignmentAlgorithm`             | No       | 'smith_waterman' (default) or 'needleman_wunsch'; unknown values fall back             |
| `color`                          | No       | A color object such as `{ "field": "alphaMissense" }`; see [below](#color)             |
| `displayName`                    | No       | View name; defaults to the transcript and structure labels                             |
| `height`                         | No       | View height in pixels (default: 650)                                                   |
| `showControls`                   | No       | Show Mol\* controls panel                                                              |
| `showHighlight`                  | No       | Mark the aligned residues on the structure and in the alignment panel †                |
| `showAlignment`                  | No       | Show the pairwise alignment panel (default: true)                                      |
| `showProteinTracks`              | No       | Show the feature tracks (default: true) ‡                                              |
| `compactTracks`                  | No       | Draw the feature tracks at reduced height (default: true) ‡                            |
| `trackHeight`                    | No       | Height in px of one feature-track row, 2 to 40, overriding `compactTracks` ‡           |
| `showAllFeatureTracks`           | No       | Also draw the minor UniProt types and the hydrophobicity track ‡                       |
| `autoScrollAlignment`            | No       | Scroll the alignment to the hovered residue ‡                                          |
| `zoomToBaseLevel`                | No       | Zoom to base level on click (default: true)                                            |
| `sideBySide`                     | No       | Place a `connectedView` this launch creates beside the protein view                    |
| `variant`                        | No       | A base or change, `chr17:7674220 C>T`, labelled and selected; see [below](#variant)    |
| `initialTranscriptResidues`      | No       | `{ start, end }` or an array of them: 1-based transcript residues lit on load          |
| `initialResidues`                | No       | The same by author residue numbers, the way a paper cites a site (R248 → 248)          |
| `initialSelection`               | No       | The same as 0-based half-open position ranges, for callers that already have them      |
| `mappedEntityId`                 | No       | mmCIF entity id the transcript maps to; chosen by alignment when absent                |
| `pairwiseAlignment`              | No       | `{ consensus, alns: [{ id, seq }, { id, seq }] }`, transcript row first, used as given |
| `alignmentImported`              | No       | Whether `pairwiseAlignment` is used exactly as given; true when one is present         |
| `hidden`                         | No       | Leave the structure out of the 3D canvas; it stays mapped and superposed               |
| `assembly`                       | No       | Assembly id to build (default: the first), or `deposited` for every chain in the file  |
| `camera`                         | No       | A fixed camera, `{ position, target, up }`; see [figure sessions](figure-sessions.md)  |
| `surface`                        | No       | A translucent molecular surface, `{ opacity }`                                         |
| `marks`                          | No       | Sites drawn as spheres, sticks or a cartoon, such as `[{ "site": "A:248" }]`           |
| `distances`                      | No       | Dashed distances between two sites, such as `[{ "a": "A:46", "b": "A:80" }]`           |
| `silhouettes`                    | No       | Outlines around every object, for a figure                                             |
| `occlusion`                      | No       | Ambient occlusion, for a figure                                                        |

\* Provide `gene` alone, a structure (`url`, `data`, `uniprotId`,
`alphaFoldComplexId`, `pdbId` or `structures`), or both. `gene` finds the
transcript, the AlphaFold model and the genome view itself, and takes any of the
others as an override. Without `gene`, `transcriptId` and a `connectedView` link
the structure to the genome.

The launch warns about a key it does not take (`ignored unknown key(s): hieght`)
and a setting of the wrong type (`` `height` is not a number ``), drops it, and
opens the rest. A `camera` or `surface` the view would refuse is dropped the
same way, with the view's reason
(`` `camera` was ignored: camera.radius is a positive number, not 0 ``). A
session spec's `id`, which pins the view's id, passes through.

## Which source a structure opens

A structure naming more than one source opens the first of these it has, and
says nothing about the rest:

1. `data`, read as given; a `url` beside `data` is not fetched.
2. `url`.
3. `alphaFoldComplexId`: the file AlphaFold DB's prediction API names for the
   complex.
4. `uniprotId`: the model AlphaFold DB's prediction API names for the accession.
5. `pdbId`: `<pdbId>.cif` from RCSB.

A `structures: [...]` session snapshot follows the same order, since both go
through `resolveStructureUrl` and then the structure loader.

`uniprotId` beside a `url` names the entry the UniProt feature tracks come from,
unless the `url` is in the PDB archive (RCSB or PDBe). For a PDB entry, by
`pdbId` or by such a `url`, SIFTS names the UniProt entry and sets the residue
numbering, and a `uniprotId` beside it changes neither. See
[residue numbering](residue-numbering.md).

## Complexes

AlphaFold DB has predicted homomers and complexes of two proteins for many human
proteins; the launch dialog lists them under "with another protein", after the
experimental complexes, with each partner and its ipTM and pLDDT. A spec opens
one by its model id, or by its file url
(`https://alphafold.ebi.ac.uk/files/AF-0000000066211449-model_v1.cif`):

```json
{
  "type": "ProteinView",
  "alphaFoldComplexId": "AF-0000000066211449",
  "transcriptId": "NM_000454.5",
  "connectedView": {
    "assembly": "hg38",
    "loc": "chr21:31,659,666-31,668,931",
    "tracks": ["hg38-ncbiRefSeqCurated"]
  }
}
```

The file name of a complex names no protein, so the UniProt entry of each chain
comes from the file itself, ModelCIF's `ma_target_ref_db_details`, which every
AlphaFold DB model carries. The UniProt tracks and AlphaMissense follow the
chain the transcript maps to, so picking a heterodimer's partner chain in the
chain picker shows the partner's features, and a `uniprotId` beside a complex
changes nothing. The structure is labelled by its proteins,
`AlphaFold complex SOD1 ×2` or `AlphaFold complex GSTP1 + GSTM1`, once the file
has loaded.

Only the transcript's chain maps to the genome. A heterodimer's partner chain
stays grey under AlphaMissense and the other per-residue colors, and hovering it
lights nothing on the genome.

## `color`

A color object in the grammar jbrowse-components' tracks use, applied to every
structure. `field` names what colors a residue, the entries of the view's
**Color by** menu:

| `field`                  | Colors by                                          |
| ------------------------ | -------------------------------------------------- |
| unset (`{}`)             | Mol\*'s default, by element and chain              |
| `plddt`                  | AlphaFold's pLDDT confidence                       |
| `chain`                  | Chain                                              |
| `secondaryStructure`     | Secondary structure                                |
| `hydrophobicity`         | Kyte-Doolittle hydropathy                          |
| `residueName`            | Residue type                                       |
| `bFactor`                | B-factor, or a model's uncertainty                 |
| `moleculeType`           | Molecule type                                      |
| `mappedChain`            | The chain the transcript maps to, the rest grey    |
| `alphaMissense`          | Mean AlphaMissense pathogenicity                   |
| `clinvarPathogenicCount` | How many substitutions ClinVar calls pathogenic    |
| `domain`                 | The domains and sites a connected MSA view draws   |
| `exon`                   | The exon of the transcript a residue's codon is in |

`hydrophobicity` and `alphaMissense` are linear scales and
`clinvarPathogenicCount` a threshold scale, so their color object also takes
that scale's members, each overriding the plugin's preset: `range`, `domainMin`,
`domainMax`, `domainMid`, `labels` and `title` for a linear one, and `domain`
(the cuts), `range`, `labels` and `title` for a threshold one. The 3D view, the
legend and the alignment's hydrophobicity row all follow them:

```json
{ "field": "alphaMissense", "range": ["#1a9850", "#ffffbf", "#d73027"] }
```

Every other field takes Mol\*'s colors, the MSA view's (`domain`), two fixed
ones (`mappedChain`) or a fixed palette (`exon`), so its color object names the
field alone. The launch refuses any other member on such a field, and any member
a scale does not take, with a message naming it.

The `colorScheme` names older sessions and urls wrote still load:
`plddt-confidence`, `chain-id`, `secondary-structure`, `hydrophobicity`,
`residue-name`, `uncertainty`, `molecule-type`, `mapped-chain`, `alphamissense`,
`clinvar` and `alignment-domains` become the fields above in that order, and
`default` or an unknown name becomes `{}`.

`alphaMissense` and `clinvarPathogenicCount` color by variant effect, one value
per residue:

- `alphaMissense`: the mean AlphaMissense pathogenicity of every substitution at
  the residue, from AlphaFold DB's `AF-<accession>-F1-aa-substitutions.csv`,
  blue (likely benign, 0) through white (0.5) to red (likely pathogenic, 1).
- `clinvarPathogenicCount`: how many distinct missense substitutions ClinVar
  calls pathogenic or likely pathogenic at the residue, pale for none to dark
  red for four or more. The plugin reads NCBI's ClinVar VCF by range over the
  transcript's coding span (`vcf_GRCh38` or `vcf_GRCh37`, after the connected
  genome view's assembly) and keeps single-base substitutions whose aggregate
  `CLNSIG` says `Pathogenic` or `Likely_pathogenic`; a conflicting
  classification does not count. Each one is translated on the transcript's own
  codon, so a variant that is synonymous, nonsense or non-coding on this
  transcript drops out.

AlphaMissense numbers a UniProt entry, so its values land the way the UniProt
feature tracks do: one to one on an AlphaFold model of the entry, through SIFTS
on a PDB entry. Every residue of an AlphaFold isoform model stays grey, since
the scores do not number it, as does a structure with no UniProt entry, and a
model mapped one to one whose chain spells the entry differently (a model folded
from an older revision).

ClinVar is read off the genome, so its values land through the structure's
alignment to the transcript, as a genome hover does. A structure stays grey when
it has no transcript, when its transcript has no connected genome view to read
the assembly from, or when that view shows an assembly other than GRCh38 or
GRCh37. `hg38`, `hg19`, `GRCh38.p14` and NCBI's accessions for them
(`GCF_000001405.26`–`.40`, `GCA_000001405.15`–`.29` for GRCh38;
`GCF_000001405.13`–`.25`, `GCA_000001405.1`–`.14` for GRCh37) count, T2T's `hs1`
does not. A mitochondrial gene on hg19 stays grey too: hg19's chrM is NC_001807,
not the rCRS that GRCh37's VCF numbers as `MT`. When most of the variants read
under a transcript disagree with the genome on `REF`, the assembly is taken for
another build and the structure stays grey with a message saying so.

A residue nothing places stays grey. The structure's header row says why a
structure is grey, and a failed download says so there too; switching to another
field and back retries it.

The values arrive after the structure is shown and only recolor it: a selection
and the camera do not wait for them. The view's ready marker does, so a capture
lands on the painted cartoon.

`domain` colors by the domains an MSA view
([jbrowse-plugin-msaview](https://github.com/GMOD/jbrowse-plugin-msaview)) draws
on its query row, such as NCBI CDD hits. In grammar-of-graphics terms:

- **Data**: msaview's `connectedDomains`, one feature per accession with its
  genome regions and a `kind`, `domain` or `site`. The MSA view pairs with the
  structure by sharing its `connectedViewId`.
- **Layers**, filtered on `kind`: domains draw with the cartoon mark, and sites
  draw with the sticks mark on their residues' side chains, over the cartoon. A
  site such as HBB's heme pocket then shows as side chains reaching into the
  heme, and never hides the domain it sits in.
- **Color channel**: both layers read msaview's one color object, a categorical
  scale from each accession (`domain`) to the color the alignment fills it with
  (`range`).
- **Marks**: a backbone mark (cartoon, trace) takes the domain color. An atom
  mark (ball-and-stick, spacefill, lines) takes the site color where a site
  covers the residue, so a site residue keeps one color wherever its atoms draw.
  Mol\*'s own ball-and-stick of a ligand's bonded residues follows the rule too,
  and HBB's heme-bonded His92 draws in the heme site's color.
- **Draw order**: within a layer the smaller entry draws on top, so a residue
  two sites share shows the smaller site.
- **Guide**: the header legend shows the color object's `labels` in two groups,
  domains as cartoon and sites as side chains.

The plugin maps each region to the transcript's residues, then to the structure
through its alignment to the transcript, the path a genome hover takes:

- Residues outside every domain, and chains other than the mapped one, stay
  grey.
- Toggling a domain or hiding the overlay in the MSA view redraws both layers.
- With no MSA view on the genome view, or none showing domains, the structure
  stays grey and its header row says which.
- msaview 5.5.0 sends no `kind`, so with it every entry draws on the cartoon.

The alignment panel also lists the alignment's domains as rows, whatever the
view colors by; see
[UniProt feature tracks](uniprot-feature-tracks.md#rows-from-the-alignment).

`exon` colors each residue by the exon of the structure's transcript its codon
sits in, which shows the part of the fold an exon builds: what a skipping event
removes, where an alternative exon lands, whether an exon matches a domain.

- **Numbering**: exons count from the transcript's 5′ end, from the genome's
  right on the minus strand. The feature's `exon` subfeatures are the exons when
  it has them (GFF3, GTF), so a 5′ UTR exon is counted and the numbers are the
  gene's own, GENCODE's `exon_number`. Without them, its CDS and UTR rows are
  joined where they touch, which rebuilds the exons of a bigBed or BED12
  transcript. A feature with CDS rows alone cannot say how many UTR exons come
  first, so its numbers count coding exons and the legend says "Coding exon".
- **Alignment indels**: blocks 9 bp apart or closer are one exon. A RefSeq
  transcript's blocks come from its alignment to the genome, and an indel there
  opens a gap of a base or a few inside an exon: canine SOD1 (NM_001003035.1 on
  canFam4) carries a 1-bp gap at 27,125,696 that split its fourth exon and
  numbered a five-exon gene as six. No intron is that short: the shortest known
  are 15 bp, in the ciliate _Stentor_, and a mammal's run to tens of bp. Only
  the numbering changes; the codons, and every residue's genome position, are
  read from the blocks as given, so the base an indel skips is still in no
  codon.
- **Split codons**: a codon an intron splits takes the exon holding two of its
  three bases. Only a boundary in phase 1 or 2 splits a codon, so a "junction"
  color would mark some boundaries and not others.
- **Colors**: Tableau 10 without its grey, repeated along the transcript, so
  neighboring exons always differ. The legend has one row per color naming every
  exon it paints ("Exons 1, 10, 19"), which keeps a 50-exon gene to nine rows.
  The hover readout ends with the residue's exon while the view colors by exon,
  named as the legend names it ("Coding exon 3" under coding numbering), and
  `structure.locateResidues` always carries it (see
  [Reading what a view resolved](reading-the-view.md#locating-a-residue)).
- Residues the alignment to the transcript does not reach, and chains other than
  the mapped one, stay grey. A structure with no transcript stays grey and its
  header row says so.

## `structures`

Each entry of `structures` is one structure: a source (`url`, `data`,
`uniprotId`, `alphaFoldComplexId` or `pdbId`) and, optionally,
`initialTranscriptResidues`, `initialResidues`, `initialSelection`,
`mappedEntityId`, `pairwiseAlignment`, `alignmentImported`, `hidden` and
`assembly`. `feature`, `userProvidedTranscriptSequence` and `connectedViewId`
written on the launch are the defaults every entry shares, and an entry may
carry its own.

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

## `variant`

`variant` names one genome base, and optionally the substitution there:

- `chr17:7674220 C>T`: a 1-based position, then the reference and alternate
  bases on the genome's forward strand, the way a VCF line or an HGVS `g.` name
  spells them. Commas in the number and the space before the change are
  optional, and the refName may be any alias the assembly knows.
- `chr17:7674220`: the position alone.

The launch translates the variant on each structure's transcript, the entry's
own `feature` or else the launch's (`gene`, `transcriptId` or `feature`),
reading the codon off the connected genome view's assembly, then:

- adds a session highlight on the base, labelled with the protein change. The
  genome view draws it as a band, and each structure on the transcript draws the
  residue as a labelled sphere, the label read as the residue the structure has
  there (`R248Q` reads `Arg248` on wild type, `Gln248` on an R248Q structure),
- seeds `initialTranscriptResidues` on the residue of its own transcript for
  every structure that declares no selection of its own, so the camera frames
  it. An isoform numbers the codon its own way: on TP53's Δ133 isoform R248 is
  residue 116. A structure whose transcript does not hold the codon opens
  unseeded.

The label is the change in one-letter code on the transcript's numbering, the
launch's transcript where it holds the codon, otherwise the first structure's
that does:

| Change                | Label   |
| --------------------- | ------- |
| missense              | `R248Q` |
| synonymous            | `R248=` |
| nonsense              | `R248*` |
| a position, no change | `R248`  |

A synonymous or nonsense change still opens, since the residue is a real place
on the structure; only a missense label is rewritten to the structure's residue.

The launch refuses, with an error naming the variant, when:

- the text is neither spelling,
- neither the launch nor any entry of `structures` names a transcript, or there
  is no connected genome view to read an assembly from,
- the assembly has no such sequence,
- on every structure's transcript, the base is outside a whole codon of the
  coding sequence (an intron, a UTR, another chromosome, a codon cut short by
  the CDS's phase), or in its stop codon; the error names each transcript's
  reason,
- the reference base is not the genome's
  (`names G as the reference base, and the genome has C there`), which on a
  minus-strand gene usually means the bases were written on the transcript's
  strand rather than the genome's.

A codon split by an intron reads in the transcript's order, and a minus-strand
transcript complements the bases, as the ClinVar color does.

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
and ignores exon subfeatures. Only the `exon` color reads them, to number the
exons; a feature with CDS alone colors by coding exon.

## `ProteinAnnotationView`

The `LaunchView-ProteinAnnotationView` extension point opens the 1D protein view
of a UniProt entry;
[launching](launching.md#the-1d-protein-view-proteinannotationview) has a
working link.

| Parameter         | Required | Description                                                                 |
| ----------------- | -------- | --------------------------------------------------------------------------- |
| `uniprotId`       | Yes\*    | UniProt accession; an isoform suffix (`P04637-7`) opens its entry           |
| `gene`            | Yes\*    | Gene name, found through the assembly's text search index                   |
| `transcriptId`    | No       | Transcript id/name to resolve from `connectedView`                          |
| `connectedView`   | No       | LinearGenomeView settings (`loc`/`assembly`/`tracks`) to create and connect |
| `connectedViewId` | No       | ID of an existing connected LinearGenomeView                                |

\* Provide `uniprotId`, `gene`, or both. `gene` and `transcriptId` resolve the
transcript exactly as they do for a ProteinView, and `gene` alone also finds the
entry. A `uniprotId` beside `gene` picks the transcript that matches its
AlphaFold model, so `P04637-7` links isoform 7's transcript to P04637's view.
Without either the view opens unlinked, and the launch warns about a
`connectedView` or `connectedViewId` it then has no use for. It also warns about
an unknown key (`ignored unknown key(s): pdbId`) or a value of the wrong type,
and drops it.
