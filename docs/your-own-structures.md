# Opening your own predicted structures

The plugin looks up AlphaFold DB and the PDB by default, but it maps any protein
structure to the genome the same way: it translates the transcript, aligns that
translation to the structure's own sequence, and links residues to codons
through the alignment. A model you folded yourself — with ColabFold, AlphaFold
3, Boltz, ESMFold or anything else that writes PDB or mmCIF — opens exactly like
an AlphaFold DB model. The two routes below differ in who does the clicking.

## From the gene: the "File or URL" tab

1. Right-click a gene or transcript and choose **Launch protein view**.
2. Open the **File or URL** tab and either pick a local file or paste a URL.
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

Nothing in the plugin's config swaps AlphaFold DB for your own server in the
right-click dialog. To give people one-click access to a set of predictions,
generate a link per gene instead. A session spec with a `url` and a
`transcriptId` opens your model connected to the genome, resolving the
transcript from a gene track the same way the AlphaFold short form does:

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
  return `https://jbrowse.org/code/jb2/latest/?config=/ucsc/hg38/config.json&session=spec-${encodeURIComponent(JSON.stringify(spec))}`
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
[Launching](launching.md) lists every parameter and the feature shape.

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

In the running view, **Add structure...** does the same by hand.

## What carries over from AlphaFold DB, and what does not

**Confidence.** The plugin reads each residue's B-factor as pLDDT, draws it as
the confidence track, and offers the **pLDDT confidence** colour scheme, for any
structure that does not declare itself experimental. mmCIF declares that in
`_exptl.method`; PDB-format files carry no such field, so their B-factors always
count as confidence. Predictors that write pLDDT into the B-factor column on
AlphaFold's 0–100 scale get a correct track for free. If yours writes 0–1, or
the file holds real B-factors from refinement, the track and the colours will
mislead — rescale the column or leave that colour scheme alone.

**UniProt feature tracks.** Domains, sites and variants need a UniProt
accession, and the file name of your model does not carry one. Add `uniprotId`
beside `url` to supply it:

```js
{ url: 'https://example.org/folds/TP53_model_0.cif', uniprotId: 'P04637' }
```

`url` still decides which file opens. The plugin then places UniProt position
`p` at residue `p` of your model, as it does for an AlphaFold DB model, so only
add the accession to a full-length model of the canonical UniProt sequence
numbered from 1. For a domain, a construct or another isoform, leave it off: no
tracks is better than tracks drawn on the wrong residues. The genome mapping
does not depend on this — it comes from the alignment either way.

**Complexes.** A multi-chain prediction, such as an AlphaFold 3 or Boltz
complex, maps the transcript to the protein chain with the highest identity over
the shorter sequence, and never to a DNA or RNA chain. When two chains are
copies or paralogs and the wrong one wins, the alignment panel's **Mapped
chain** picker overrides it, and a spec can do the same with `mappedEntityId`.

**Several models.** A prediction run usually writes each ranked model to its own
file; list the ones you want in `structures`. A single file with several `MODEL`
records opens as an ensemble, every model coloured and highlighted together.

**Residue numbers.** The ruler and hover label show the file's own residue
numbers (`auth_seq_id`). A predictor numbering from 1 over the whole sequence
matches UniProt; one that folded a fragment starts wherever it chose.
[Residue numbering](residue-numbering.md) explains how a spec's
`initialResidues` and `initialTranscriptResidues` behave on such a file.
