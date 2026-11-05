# Opening your own predicted structures

The plugin looks up AlphaFold DB and the PDB by default, but it maps any protein
structure to the genome the same way: it translates the transcript, aligns that
translation to the structure's own sequence, and links residues to codons
through the alignment. A model you folded yourself — with ColabFold, AlphaFold
3, Boltz, ESMFold or anything else that writes PDB or mmCIF — opens exactly like
an AlphaFold DB model. The routes below differ in who does the clicking: a
dataset in the config offers a whole genome's worth from the right-click dialog,
a file or URL opens one model by hand, and a link opens one from a page.

## For a whole genome: a dataset in the config

A site that folded every protein in its genome lists them once, in a mapping
file, and names that file under `protein3d.datasets` in its `config.json`:

```json
{
  "protein3d": {
    "datasets": [
      {
        "datasetId": "colabfold",
        "name": "Our ColabFold models",
        "description": "ColabFold 1.5, every protein-coding transcript",
        "mappingLocation": { "uri": "folds/mapping.tsv.gz" }
      }
    ]
  }
}
```

The mapping file is tab-separated, one structure per line: an id, the
structure's url, and optionally its UniProt accession and a label.

```
#transcript_id	url	uniprot	label
ENST00000369535.5	NRAS.pdb	P01111	NRAS rank 1
ENST00000311936.8	KRAS.cif	P01116	KRAS-4B rank 1
```

[example_data/folds](../example_data/folds) holds this file and its two
structures. A line starting with `#` is a comment. A relative url is read
against the mapping file's own, so the file and the structures can sit side by
side wherever they are hosted, and `mappingLocation` itself is relative to the
config. The file may be gzipped. The browser fetches the mapping and every
structure, so the server has to send `Access-Control-Allow-Origin`, as for any
URL below.

Right-click a gene and choose **Launch protein view**: the **Structures for**
list then leads with the dataset's structures for that gene, each with the
dataset's name beside it, and checks the first. A structure is offered when its
id is one of a coding transcript's — its `name`, `ID`, `transcript_id`, or its
protein's `protein_id` — or else the gene's own name or id, so a set keyed by
gene symbol serves every isoform. Ensembl's `transcript:` and `gene:` and NCBI's
`rna-` and `gene-` prefixes are ignored on both sides, and so is a version
written on only one side: `ENST00000369535` finds `ENST00000369535.5`, but
TAIR's `AT1G01010.2` does not find `AT1G01010.1`. The right-clicked isoform's
structures come first, then those of the isoform the annotation flags
(`MANE_Select`, `Ensembl_canonical`), then the rest. Several lines under one id
are several rows, such as a run's ranked models.

The dataset's structure is checked by default rather than the AlphaFold model,
for two reasons. It was folded from the transcript its line names, so the launch
maps it through that transcript straight away, with no ranking of isoforms; and
a site with its own folds is often a genome AlphaFold DB has no model for at
all. The dataset's rows need no UniProt accession, so they are offered for a
gene the UniProt lookup cannot place. Check AlphaFold DB's model or a PDB entry
beside it and they open superposed onto the site's, mapped to the same
transcript. The UniProt accession on a line goes with the structure as its
`uniprotId`, which supplies the UniProt feature tracks: give one only for a
full-length model of the canonical sequence numbered from 1, as
[below](#what-carries-over-from-alphafold-db-and-what-does-not) explains.

A mapping file that fails to load leaves one line in the list naming the
dataset, and every other source is listed as usual.

**How big a file can be.** The plugin reads the whole mapping once a page, on
the first dialog that needs it, and reads each line's id and nothing else until
a gene asks for it, so there is no index file to build. Measured 2026-11-05 on a
genome's worth of ColabFold paths, 60,000 lines and 7.3 MB (729 kB gzipped):
served to hosted JBrowse from local disk, the site's row appeared 0.53–0.67 s
after **Launch protein view** was clicked, against 0.53–0.56 s for a two-line
file, and Node inflated and indexed the file in well under half a second. What
grows with the set is the one download, which every dataset in the config makes
on the first dialog of a page whichever gene was clicked.

A session spec opens a dataset's structure too, by `datasetId` beside a
`transcriptId` or a `gene`; see
[launch parameters](launch-parameters.md#datasetid).

## From the gene: the "Your file or URL" tab

1. Right-click a gene or transcript and choose **Launch protein view**.
2. Open the **Your file or URL** tab and either pick a local file or paste a
   URL.
3. Choose the transcript to map. The dialog reads the structure's sequence and
   ranks the gene's isoforms against it, and flags a sequence that differs from
   the translation. A small difference is fine — the alignment absorbs it.
4. **Launch**.

A picked file travels with the session: the plugin stores its text inline, so a
saved or shared session reopens it without the original file, at the cost of a
larger session. A URL keeps the session small but has to stay reachable.

Local files may be `.pdb`, `.cif`, `.mmcif` or `.ent`, optionally gzipped. The
plugin reads the format from the content rather than the file name (a first line
starting with `data_` is mmCIF), so a misnamed file still opens.

## From a link: a session spec per gene

A page that links to your models, rather than a config you control, generates a
link per gene. A session spec with a `url` and a `transcriptId` opens your model
connected to the genome, resolving the transcript from a gene track the same way
the AlphaFold short form does:

```js
function linkFor({ modelUrl, transcriptId, loc }) {
  const spec = {
    views: [
      {
        type: 'ProteinView',
        url: modelUrl,
        transcriptId,
        connectedView: {
          assembly: 'hg38',
          loc,
          tracks: ['hg38-ncbiRefSeqCurated'],
        },
      },
    ],
  }
  return `https://jbrowse.org/code/jb2/main/?config=/ucsc/hg38/config.json&session=spec-${encodeURIComponent(JSON.stringify(spec))}`
}

linkFor({
  modelUrl: 'https://example.org/folds/TP53_model_0.cif',
  transcriptId: 'NM_000546.6',
  loc: 'chr17:7,668,421-7,687,550',
})
```

The browser fetches `modelUrl` itself, so the server hosting it has to send
`Access-Control-Allow-Origin` (GitHub Pages, S3 with a CORS rule and most object
stores can) and serve over https when JBrowse does. A URL may also point at
BinaryCIF (`.bcif`).

Swap `transcriptId` and the track for an explicit `feature` and
`userProvidedTranscriptSequence` when the transcript is not in any track, such
as a novel isoform you folded from your own annotation.
[Launch parameters](launch-parameters.md) lists every argument and the feature
shape.

### Comparing your model with AlphaFold DB or the PDB

`structures` opens several structures in one view, superposed with TM-align and
each mapped to the same transcript, so a prediction sits directly on the
reference model or the crystal structure:

```js
{
  type: 'ProteinView',
  structures: [
    { url: 'https://example.org/folds/TP53_model_0.cif' },
    { uniprotId: 'P04637' }, // the AlphaFold DB model
    { pdbId: '1TUP' },
  ],
  transcriptId: 'NM_000546.6',
  connectedView: { assembly: 'hg38', loc: 'chr17:7,668,421-7,687,550', tracks: ['hg38-ncbiRefSeqCurated'] },
}
```

In the running view, **Add structure...** does the same by hand. The fit uses
only the chain each structure maps to the transcript, and a chain too short or
too unlike the first structure's for TM-align is fit on its transcript-matched
residues instead, with a chip on its header row; see
[several structures in one launch](launching.md#several-structures-in-one-launch).

## What carries over from AlphaFold DB, and what does not

**Confidence.** The plugin reads each residue's B-factor as pLDDT, draws it as
the confidence track, and offers **Color by** pLDDT confidence, for any
structure that does not declare itself experimental. mmCIF declares that in
`_exptl.method`; PDB-format files carry no such field, so their B-factors always
count as confidence. Predictors that write pLDDT into the B-factor column on
AlphaFold's 0–100 scale get a correct track for free. If yours writes 0–1, or
the file holds real B-factors from refinement, the track and the colors will
mislead — rescale the column or leave that coloring alone.

**UniProt feature tracks.** Domains, sites and variants need a UniProt
accession, which the file name of your model does not carry. A ModelCIF that
names each entity's UniProt entry in `ma_target_ref_db_details`, as every
AlphaFold DB file does, supplies it chain by chain with nothing added. Otherwise
add `uniprotId` beside `url` to supply it, but only for a full-length model of
the canonical UniProt sequence numbered from 1:
[UniProt feature tracks](uniprot-feature-tracks.md#your-own-models) explains
why. The genome mapping does not depend on this — it comes from the alignment
either way.

**Complexes.** A multi-chain prediction, such as an AlphaFold 3 or Boltz
complex, maps the transcript to the protein chain with the highest identity over
the shorter sequence, and never to a DNA or RNA chain. When two chains are
copies or paralogs and the wrong one wins, the chain picker on the structure's
header row overrides it, and a spec can do the same with `mappedEntityId`.

**Several models.** A prediction run usually writes each ranked model to its own
file; list the ones you want in `structures`. A single file with several `MODEL`
records opens as an ensemble, every model colored and highlighted together.

**Residue numbers.** The ruler and hover label show the file's own residue
numbers (`auth_seq_id`). A predictor numbering from 1 over the whole sequence
matches UniProt; one that folded a fragment starts wherever it chose.
[Residue numbering](residue-numbering.md) explains how a spec's
`initialResidues` and `initialTranscriptResidues` behave on such a file.
