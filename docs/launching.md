# Launching a protein view from a URL or from code

The plugin registers a `LaunchView-ProteinView` extension point, which JBrowse
calls for every `ProteinView` entry in a
[session spec](https://jbrowse.org/jb2/docs/urlparams/#session-spec). A spec is
a _resolving_ contract: short-form props like `uniprotId` and `transcriptId`
become a structure URL, a transcript feature and an alignment sequence before
the view exists. To restore a view exactly as it was saved instead, see
[saved sessions](sessions.md).

[Parameters](#parameters) lists every argument, the precedence between `data`,
`url`, `uniprotId` and `pdbId`, and the `feature` shape.

## A structure on its own

```
https://jbrowse.org/code/jb2/main/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","url":"https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif"}]}
```

## A structure connected to the genome

A **connected** view links the structure to a LinearGenomeView: hovering a
variant highlights the matching residue on the structure, and clicking a residue
highlights the codon in the genome. Launching from a gene's context menu makes
that connection for you. A demo link or an embedding app builds the same
connected session declaratively, in one of two ways depending on whether a track
in the genome view already serves the transcript.

### By gene name: `gene`

On a config whose assembly has a text search index over a gene track, a gene
name is the whole spec:

```
https://jbrowse.org/code/jb2/main/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","gene":"TP53"}]}
```

The plugin looks the name up as the genome view's search box does, opens a
genome view on the gene with the track the index found it in, and works out the
rest as the launch dialog's defaults do: the UniProt entry from the gene's
identifiers, the AlphaFold model of that entry, and the isoform that model was
folded from. Where the model matches several isoforms, or there is no model, a
GENCODE track's `MANE_Select` (else `Ensembl_canonical`) transcript leads;
NCBI's RefSeq GFF carries no such tag. Anything else the spec names wins over
what the lookup would pick:

- `pdbId`, `uniprotId`, `url` or `structures` choose the structure,
- `transcriptId` chooses the isoform, among the gene's own,
- `connectedView.assembly` chooses the assembly (see
  [`connectedView`](#connectedview) for the order), and `connectedView.loc` and
  `tracks` replace the gene's span and the indexed track; where the name has
  hits on several sequences, as on an alt contig, the gene on the `loc`'s
  sequence wins over the first hit.

A `feature` or `userProvidedTranscriptSequence` on the launch spells the
transcript out, and the gene is then not looked up at all, since the model,
translation and genome view the lookup picks all follow the transcript it finds.
Name the structure and a `connectedView` beside them, as the
[explicit form](#explicit-form-url--feature--userprovidedtranscriptsequence)
does.

```
https://jbrowse.org/code/jb2/main/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","gene":"TP53","pdbId":"1TUP","initialResidues":{"start":248,"end":248}}]}
```

The launch fails with an on-screen error when the name has no search hit, when
two reviewed UniProt entries answer to the gene, or when AlphaFold DB has no
model for its entry; name a `uniprotId` or `pdbId` to settle the last two.

### Opening on a variant: `variant`

A launch can name a variant instead of a residue, and the plugin works out which
residue it changes:

```
https://jbrowse.org/code/jb2/main/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","gene":"TP53","pdbId":"1TUP","variant":"chr17:7674220 C>T"}]}
```

`chr17:7674220 C>T` is ClinVar's NC_000017.11:g.7674220C>T, TP53 c.743G>A. TP53
is on the minus strand, so the plugin complements the bases, finds the second
base of codon 248 (CGG to CAG), and:

- highlights the base on the genome view, labelled `R248Q`,
- draws residue 248 on 1TUP as a sphere labelled `Arg248`, 1TUP's own residue
  there (its chain is numbered from 94, which the alignment takes care of),
- selects that residue, as `initialTranscriptResidues: { start: 248, end: 248 }`
  would, so the camera frames it.

The variant works with every form below as well as `gene`, and with
`structures`, where each structure places it on its own transcript, the entry's
`feature` or the launch's, so an isoform selects its own residue (R248 is
residue 116 of TP53's Δ133 isoform). It selects in each structure that names no
selection of its own and whose transcript holds the codon. A position alone
(`chr17:7674220`) highlights and selects the residue and labels it `R248`. A
base outside the coding sequence, or a reference base the genome does not have,
fails the launch with an on-screen error; [launch parameters](#variant) lists
the rules.

### Short form: `uniprotId` / `pdbId` + `transcriptId`

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
https://jbrowse.org/code/jb2/main/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","uniprotId":"P04637","transcriptId":"NM_000546.6","connectedView":{"assembly":"hg38","loc":"chr17:7,668,421-7,687,550","tracks":["hg38-ncbiRefSeqCurated","hg38-clinvarMain"]}}]}
```

To open an **experimental** structure instead of an AlphaFold model, swap
`uniprotId` for `pdbId`:

```
https://jbrowse.org/code/jb2/main/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","pdbId":"1TUP","transcriptId":"NM_000546.6","connectedView":{"assembly":"hg38","loc":"chr17:7,668,421-7,687,550","tracks":["hg38-ncbiRefSeqCurated","hg38-clinvarMain"]}}]}
```

1TUP is p53's core domain bound to DNA: entities [0] and [1] are the DNA strands
and the protein is entity [2], so it exercises `chooseMappedEntity`, and its
chain starts at UniProt residue 94, so it exercises the SIFTS offset that places
the UniProt feature tracks. [demos.md](demos.md) collects more structures like
it, and [harness/](../harness/) runs the mapping on them in isolation.

`transcriptId` works with a plain `url` too, which is how a link opens a
structure you predicted yourself, and with `datasetId`, which opens the one a
dataset in the site's config lists for the transcript: see
[your own structures](your-own-structures.md).

Given `transcriptId`, the plugin:

- derives the structure URL from `uniprotId` (whichever model AlphaFold DB's
  prediction API names for the transcript) or `pdbId` (`<pdbId>.cif` from RCSB),
  unless `url` is given,
- fetches features at `loc` from the feature tracks among the `connectedView`
  `tracks` and picks the first transcript whose name, ID or `transcript_id`
  matches `transcriptId` (trailing version optional, so `NM_000546` matches
  `NM_000546.6`; `transcript_id` is how an Ensembl GFF3 spells the ID without
  its `transcript:` prefix),
- translates that transcript's CDS against the connected assembly to build the
  alignment sequence.

If any step fails (no structure for that id, transcript not found at that locus,
transcript has no CDS, or it can't be translated), the plugin aborts the launch
with an on-screen error rather than leaving a half-wired structure, so a typo in
`transcriptId` is visible, not silent.

A `feature` or `userProvidedTranscriptSequence` on the launch is the transcript
itself, and `transcriptId` is then not looked up.

> The matched transcript must be present in one of the feature tracks at `loc`.
> If it isn't (a custom isoform, or a track that isn't loaded), use the explicit
> form.

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
        tracks: ['hg38-ncbiRefSeqCurated', 'hg38-clinvarMain'],
      },
    },
  ],
})}`
```

`connectedView` takes a LinearGenomeView's `loc`, `assembly` and `tracks`,
written flat; [launch parameters](#connectedview) has the details.

### Several structures in one launch

`structures` opens one view holding several structures, superposed with TM-align
and each mapped to the same transcript — what the view's **Add structure...**
dialog builds by hand, and what the launch dialog opens when several rows of its
structure list are checked (a dataset's structure, else the AlphaFold model,
first, so the rest are placed on it; a short fragment opens on its own). Each
entry takes `url`, `data`, `uniprotId`, `pdbId` or `datasetId`, and may carry
its own `initialTranscriptResidues`, `initialResidues` or `initialSelection`, a
`mappedEntityId`, a `pairwiseAlignment`, `hidden`, and a `feature` and
`userProvidedTranscriptSequence` of its own where the launch-wide ones do not
apply. Those same keys written on the launch are the one-structure shorthand;
beside `structures` a source or a selection written there applies to no
structure, and the launch says so in a warning and opens the rest.
[Launch parameters](#structures) lists what the launch reports, and
[residue numbering](residue-numbering.md) covers how a residue number in a spec
becomes a position in the file.

```
https://jbrowse.org/code/jb2/main/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","structures":[{"uniprotId":"P04637"},{"pdbId":"1TUP"}],"transcriptId":"NM_000546.6","connectedView":{"assembly":"hg38","loc":"chr17:7,668,421-7,687,550","tracks":["hg38-ncbiRefSeqCurated","hg38-clinvarMain"]}}]}
```

Each structure is superposed on the first by one copy of the chain its
transcript maps to: the first copy drawn, the one its highlight labels sit on. A
binding partner, the second copy of a homodimer and a DNA strand take no part in
the fit, so the gene's own chain lands on the gene's own chain. TM-align places
it, unless the shorter of the two chains has fewer than 30 traced residues or
TM-align scores the pair under 0.5 (normalised by the shorter chain). Then the
structure is fit on the residues the two chains align to the same transcript
positions, or left where its file puts it when there are fewer than five of
those or under half of them are the same amino acid, and its row in the header
carries a chip saying which, with the numbers in its tooltip. Mol\*'s log has
one line per structure either way. A structure with no transcript is aligned
whole, and picking another chain in a row's chain picker superposes that
structure again by the new chain.

## The 1D protein view: `ProteinAnnotationView`

The launch dialog's **Launch 1D protein annotation view**, under the arrow
beside **Launch**, opens a UniProt entry as a linear view, with its domains,
ClinVar's missense calls on the transcript, AlphaMissense scores and AlphaFold
confidence as tracks. A `ProteinAnnotationView` spec entry opens the same view,
registered as the `LaunchView-ProteinAnnotationView` extension point (the view
itself is a LinearGenomeView on a temporary assembly of the entry). It arrived
in 1.6.0.

`uniprotId` names the entry, and an isoform accession such as `P04637-7` opens
its entry, since UniProt publishes features for the entry only. The transcript
linkage is spelled the way a ProteinView spec spells it: `gene`, or
`transcriptId` with a `connectedView`, each optionally pinned to an existing
genome view with `connectedViewId`. A `gene` alone also finds the entry. Without
`gene` or `transcriptId` the view opens unlinked.

```
https://jbrowse.org/code/jb2/main/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinAnnotationView","uniprotId":"P04637","transcriptId":"ENST00000504937.5","connectedView":{"assembly":"hg38","loc":"chr17:7,668,421-7,687,550","tracks":["hg38-gencodeComp","hg38-clinvarMain"]}}]}
```

That link opens TP53's Δ133 isoform against P04637. The view aligns the
transcript to the entry when it opens, so a hover on the isoform's codon for
R248 lights the entry's residue 248, not residue 116, and a codon the two do not
share lights nothing. The launch opens every track, since the track selector
cannot reopen one on a temporary assembly.

A spec's `displayName` goes to the first view the launch creates, which is the
genome view when the launch opens one. Leave it out to keep the 1D view's own
name, which joins the entry, gene and transcript.

## From code

The same arguments go to the extension point directly:

```typescript
await pluginManager.evaluateAsyncExtensionPointStrict(
  'LaunchView-ProteinView',
  {
    session,
    uniprotId: 'P04637',
    transcriptId: 'NM_000546.6',
    connectedView: {
      assembly: 'hg38',
      loc: 'chr17:7,668,421-7,687,550',
      tracks: ['hg38-ncbiRefSeqCurated', 'hg38-clinvarMain'],
    },
  },
)
```

The launch is async and throws on failure, after removing a `connectedView` it
created. The strict variant passes that error to the caller, as a session spec
and `jb.addView` do; `evaluateAsyncExtensionPoint` only logs it.

`pnpm test:docs` opens the standalone and connected specs above in a headless
browser, and the `Daily` workflow runs it, so a dead AlphaFold URL or a broken
launch path shows up as a failed nightly.

## Parameters

Every argument the `LaunchView-ProteinView` extension point takes, in a session
spec entry or from code.

### Arguments

| Parameter                        | Required | Description                                                                                            |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `url`                            | Yes\*    | Structure file URL (PDB or mmCIF)                                                                      |
| `data`                           | Yes\*    | The structure file's text, inline, for a structure no url serves                                       |
| `uniprotId`                      | Yes\*    | UniProt accession: the AlphaFold model, or beside `url` the UniProt tracks' entry                      |
| `alphaFoldComplexId`             | Yes\*    | AlphaFold DB complex model id, `AF-0000000066211449`; see [below](#complexes)                          |
| `pdbId`                          | Yes\*    | RCSB entry id; derives the mmCIF `url`                                                                 |
| `structures`                     | Yes\*    | Several structures in one view; see [below](#structures)                                               |
| `gene`                           | Yes\*    | Gene name, found through the assembly's text search index; enough on its own                           |
| `datasetId`                      | Yes\*    | A dataset of the config's `protein3d.datasets`; see [below](#datasetid)                                |
| `transcriptId`                   | No       | Transcript id/name to resolve from `connectedView` (required with the short form)                      |
| `userProvidedTranscriptSequence` | No       | Protein sequence for alignment                                                                         |
| `feature`                        | No       | Genomic feature for cross-linking                                                                      |
| `connectedViewId`                | No       | ID of an existing connected LinearGenomeView                                                           |
| `connectedView`                  | No       | LinearGenomeView settings (`loc`/`assembly`/`tracks`) to create and connect one                        |
| `alignmentAlgorithm`             | No       | 'smith_waterman' (default) or 'needleman_wunsch'; unknown values fall back                             |
| `color`                          | No       | A color object such as `{ "field": "alphaMissense" }`; see [below](#color)                             |
| `displayName`                    | No       | View name; defaults to the transcript and structure labels                                             |
| `height`                         | No       | View height in pixels (default: 650)                                                                   |
| `showControls`                   | No       | Show Mol\* controls panel                                                                              |
| `showHighlight`                  | No       | Mark the aligned residues on the structure and in the alignment panel †                                |
| `showAlignment`                  | No       | Show the pairwise alignment panel (default: true)                                                      |
| `showProteinTracks`              | No       | Show the feature tracks (default: true) ‡                                                              |
| `compactTracks`                  | No       | Draw the feature tracks at reduced height (default: true) ‡                                            |
| `trackHeight`                    | No       | Height in px of one feature-track row, 2 to 40, overriding `compactTracks` ‡                           |
| `showAllFeatureTracks`           | No       | Also draw the minor UniProt types and the hydrophobicity track ‡                                       |
| `autoScrollAlignment`            | No       | Scroll the alignment to the hovered residue ‡                                                          |
| `zoomToBaseLevel`                | No       | Zoom to base level on click (default: true)                                                            |
| `sideBySide`                     | No       | Place a `connectedView` this launch creates beside the protein view                                    |
| `variant`                        | No       | A base or change, `chr17:7674220 C>T`, labelled and selected; see [below](#variant)                    |
| `initialTranscriptResidues`      | No       | `{ start, end }` or an array of them: 1-based transcript residues lit on load                          |
| `initialResidues`                | No       | The same by author residue numbers, the way a paper cites a site (R248 → 248)                          |
| `initialSelection`               | No       | The same as 0-based half-open position ranges, for callers that already have them                      |
| `mappedEntityId`                 | No       | mmCIF entity id the transcript maps to; chosen by alignment when absent                                |
| `pairwiseAlignment`              | No       | `{ consensus, alns: [{ id, seq }, { id, seq }] }`, transcript row first, used as given                 |
| `alignmentImported`              | No       | Whether `pairwiseAlignment` is used exactly as given; true when one is present                         |
| `hidden`                         | No       | Leave the structure out of the 3D canvas; it stays mapped and superposed                               |
| `assembly`                       | No       | Assembly id to build (default: the first), or `deposited` for every chain in the file                  |
| `chains`                         | No       | Author chain ids to draw, such as `["B"]`; see [sessions](sessions.md#structure-properties)            |
| `filter`                         | No       | Which residues to draw, as field predicates; see [sessions](sessions.md#structure-properties)          |
| `camera`                         | No       | A fixed camera, `{ position, target, up }`; see [figures](sessions.md#figures)                         |
| `surface`                        | No       | A translucent molecular surface, `{ opacity }`                                                         |
| `marks`                          | No       | Sites drawn as spheres, sticks or a cartoon, with an optional `label`, such as `[{ "site": "A:248" }]` |
| `distances`                      | No       | Dashed distances between two sites, such as `[{ "a": "A:46", "b": "A:80" }]`                           |
| `silhouettes`                    | No       | Outlines around every object, for a figure                                                             |
| `occlusion`                      | No       | Ambient occlusion, for a figure                                                                        |

\* Provide `gene` alone, a structure (`url`, `data`, `uniprotId`,
`alphaFoldComplexId`, `pdbId`, `datasetId` or `structures`), or both. `gene`
finds the transcript, the AlphaFold model and the genome view itself, and takes
any of the others as an override. Without `gene`, `transcriptId` and a
`connectedView` link the structure to the genome.

The launch warns about a key it does not take (`ignored unknown key(s): hieght`)
and a setting of the wrong type (`` `height` is not a number ``), drops it, and
opens the rest. A `camera` or `surface` the view would refuse is dropped the
same way, with the view's reason
(`` `camera` was ignored: camera.radius is a positive number, not 0 ``). A
session spec's `id`, which pins the view's id, passes through.

### Which source a structure opens

A structure naming more than one source opens the first of these it has, and
says nothing about the rest:

1. `data`, read as given; a `url` beside `data` is not fetched.
2. `url`.
3. `alphaFoldComplexId`: the file AlphaFold DB's prediction API names for the
   complex.
4. `uniprotId`: the accession's own model, as AlphaFold DB's prediction API
   names it: `P04637` the canonical model, `P04637-4` the isoform's. An
   accession AlphaFold DB folded as isoforms alone (dystrophin, past the length
   cap) opens the isoform model folded from exactly the transcript's
   translation, else the longest. A `uniprotId` written on the launch beside
   `gene`, with no `structures`, is instead the entry the gene lookup picks the
   transcript's model from, so it opens the isoform model an isoform transcript
   was folded from.
5. `pdbId`: `<pdbId>.cif` from RCSB.

A `structures: [...]` session snapshot follows the same order, since both go
through `resolveStructureUrl` and then the structure loader.

`uniprotId` beside a `url` names the entry the UniProt feature tracks come from,
unless the `url` is in the PDB archive (RCSB or PDBe). For such a `url`, SIFTS
names the UniProt entry and sets the residue numbering, and a `uniprotId` beside
it changes neither. A `uniprotId` beside a `pdbId` is different: it ranks above
`pdbId` in the list above, so the structure opens as the AlphaFold model and the
`pdbId` is not fetched. Give the `pdbId` alone to open the PDB entry with its
SIFTS mapping. See [residue numbering](residue-numbering.md).

### Complexes

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

### `color`

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
  [Locating a residue](#locating-a-residue)).
- Residues the alignment to the transcript does not reach, and chains other than
  the mapped one, stay grey. A structure with no transcript stays grey and its
  header row says so.

### `structures`

Each entry of `structures` is one structure: a source (`url`, `data`,
`uniprotId`, `alphaFoldComplexId`, `pdbId` or `datasetId`) and, optionally,
`initialTranscriptResidues`, `initialResidues`, `initialSelection`,
`mappedEntityId`, `pairwiseAlignment`, `alignmentImported`, `hidden`,
`assembly`, `chains` and `filter`. `feature`, `userProvidedTranscriptSequence`
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

### `datasetId`

`datasetId` names one of the datasets a site's config declares under
`protein3d.datasets`
([your own structures](your-own-structures.md#for-a-whole-genome-a-dataset-in-the-config)),
and opens the structure its mapping file lists under the launch's
`transcriptId`, else under its `gene`. The id is matched as the dialog matches
it: a version on one side only, and Ensembl's and NCBI's prefixes, are ignored.
The launch takes the first line listed under the id, as its `url`, and the
line's UniProt accession as `uniprotId` unless the launch names one.

```json
{
  "type": "ProteinView",
  "datasetId": "colabfold",
  "transcriptId": "ENST00000369535",
  "connectedView": {
    "assembly": "hg38",
    "loc": "chr1:114,704,469-114,716,894",
    "tracks": ["hg38-gencode"]
  }
}
```

An entry of `structures` may carry its own `datasetId`, looked up by the same
`transcriptId` or `gene`, to put the site's structure beside AlphaFold DB's or a
PDB entry:
`"structures": [{ "datasetId": "colabfold" }, { "uniprotId": "P01111" }]`.

The launch fails with an on-screen error when the config declares no dataset by
that id, when the launch names neither `transcriptId` nor `gene`, or when the
dataset lists nothing under them. A `gene` alone finds a structure only in a set
keyed by gene; name the `transcriptId` for one keyed by transcript.

### `variant`

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

### `connectedView`

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

A launch works on one assembly: it looks its `gene` or `transcriptId` up there,
places its `variant` there and connects through it. That is the assembly of the
`connectedViewId` view (the one it is navigating to, while it still is), else
`connectedView.assembly`, else the session's first.

### Feature shape

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

### `ProteinAnnotationView`

The `LaunchView-ProteinAnnotationView` extension point opens the 1D protein view
of a UniProt entry; [launching](#the-1d-protein-view-proteinannotationview) has
a working link.

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

## Reading the result

A launch makes choices nobody wrote down: which chain the transcript maps to,
how well it aligns, which residues a fusion partner took. The header shows them
to a reader; a script or an agent reads the same things off the view model.

- **In:** an open ProteinView, from `session.views` or `jb.view(viewId)`
- **Out:** plain data: what each structure resolved to, and which residue a
  codon makes, in every numbering

The examples are read off TP53 (ENST00000269305.9) beside 1TUP on hg38, the e2e
leg `opens several structures from one spec`, which asserts them.

### `view.report`

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
- `selection` is what is selected on the structure, as 0-based half-open
  position ranges; pass them to `locateResidues({ positions: selection })` to
  name them in every numbering.
- `mapping` is absent until the alignment settles, and for a structure opened
  without a transcript. Its numbers are p2s_mapper's `alignmentQuality`, and
  `lowSimilarity` is the verdict behind the header's warning chip.
  `fusionPartnerResiduesUnmapped` counts residues the alignment paired but RCSB
  assigns to a protein fused to the transcript's, which the view unmaps.
- `superposition` says how a structure after the first was placed on it:
  `method` is `tm-align`, `residue-pairs` (a chain too short or too unlike the
  first's for TM-align, fit on its transcript-matched residues) or `unmoved`
  (too few of those, or under half of them identical, to be the same protein's).
  `structure` and `pivot` name the chain copies aligned; `tmScore`, `rmsd` and
  `alignedLength` are TM-align's over those chains, and `pairs` counts the
  residues aligned to the same transcript position, with their `identity` and,
  once placed, their `rmsd`. `description` is the header chip's tooltip and the
  line in Mol\*'s log. Absent for the first structure and a lone one.

### Locating a residue

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
    "exon": 7,
    "exonNumbering": "transcript",
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
- `exon` is the transcript's exon the codon sits in, numbered as the `exon`
  color numbers it ([launch parameters](#color)), and `exonNumbering` says how:
  `transcript` counts the gene's exons, `coding` counts coding exons alone, for
  a feature with CDS rows and nothing else. A codon an intron splits also has
  `codonExons`, every exon it spans, and `exon` is the one holding two of its
  bases.

`structure.locateGenomeRegion({ refName, start, end })` goes the other way: each
transcript residue whose codon overlaps a 0-based half-open region, in
transcript order, or undefined while the structure is loading. The refName may
be any alias the connected genome view's assembly knows; without a connected
view it has to match the transcript's own spelling. A residue the structure
lacks keeps its transcript fields and has no structure fields, so "the crystal
does not hold this codon" is an answer rather than an empty list.
`view.locateGenomeRegion(region)` asks every structure of the view.

A launch's [`variant`](#variant) reads back the same way: its highlight is in
`session.highlights`, 0-based half-open on the assembly's canonical refName and
labelled with the protein change, and `locateGenomeRegion` on that highlight
answers the residue it selected. The e2e leg
`opens on a variant, labelled on the genome and selected in 3D` asserts both for
R248Q on 1TUP.

The lookups are p2s_mapper's `locateStructureResidue`, `locateTranscriptResidue`
and `locateGenomeBase`, which work without a browser from a mapped entity, an
alignment and g2p_mapper's genome mapping.

### Changing what the view draws

To change what the view draws rather than read it, `view.applyFigure` sets the
camera, marks, distances, surface and style, and `view.currentCamera()` reads
the camera back; see [figure properties](sessions.md#figures).
