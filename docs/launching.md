# Launching a protein view from a URL or from code

The plugin registers a `LaunchView-ProteinView` extension point, which JBrowse
calls for every `ProteinView` entry in a
[session spec](https://jbrowse.org/jb2/docs/urlparams/#session-spec). A spec is
a _resolving_ contract: short-form props like `uniprotId` and `transcriptId`
become a structure URL, a transcript feature and an alignment sequence before
the view exists. To restore a view exactly as it was saved instead, see
[session snapshots](session-snapshots.md).

[Launch parameters](launch-parameters.md) lists every argument, the precedence
between `url`, `uniprotId` and `pdbId`, and the `feature` shape.

## A structure on its own

```
https://jbrowse.org/code/jb2/latest/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","url":"https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif"}]}
```

## A structure connected to the genome

A **connected** view links the structure to a LinearGenomeView: hovering a
variant highlights the matching residue on the structure, and clicking a residue
highlights the codon in the genome. Launching from a gene's context menu makes
that connection for you. A demo link or an embedding app builds the same
connected session declaratively, in one of two ways depending on whether a track
in the genome view already serves the transcript.

### Short form (recommended): `uniprotId` / `pdbId` + `transcriptId`

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
https://jbrowse.org/code/jb2/latest/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","uniprotId":"P04637","transcriptId":"NM_000546.6","connectedView":{"assembly":"hg38","loc":"chr17:7,668,421-7,687,550","tracks":["hg38-ncbiRefSeqCurated","hg38-clinvarMain"]}}]}
```

To open an **experimental** structure instead of an AlphaFold model, swap
`uniprotId` for `pdbId`:

```
https://jbrowse.org/code/jb2/latest/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","pdbId":"1TUP","transcriptId":"NM_000546.6","connectedView":{"assembly":"hg38","loc":"chr17:7,668,421-7,687,550","tracks":["hg38-ncbiRefSeqCurated","hg38-clinvarMain"]}}]}
```

1TUP is p53's core domain bound to DNA: entities [0] and [1] are the DNA strands
and the protein is entity [2], so it exercises `chooseMappedEntity`, and its
chain starts at UniProt residue 94, so it exercises the SIFTS offset that places
the UniProt feature tracks. [demos.md](demos.md) collects more structures like
it, and [harness/](../harness/) runs the mapping on them in isolation.

`transcriptId` works with a plain `url` too, which is how a link opens a
structure you predicted yourself: see
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
      feature: transcriptFeature, // see launch-parameters.md, "Feature shape"
      connectedView: {
        assembly: 'hg38',
        loc: 'chr17:7,668,421-7,687,550',
        tracks: ['ncbiRefSeqCurated', 'clinvar'],
      },
    },
  ],
})}`
```

`connectedView` takes a LinearGenomeView's `loc`, `assembly` and `tracks`,
written flat; [launch parameters](launch-parameters.md#connectedview) has the
details, including JBrowse 5's deprecation of the `init` nesting.

### Several structures in one launch

`structures` opens one view holding several structures, superposed with TM-align
and each mapped to the same transcript — what the view's **Add structure...**
dialog builds by hand. Each entry takes `url`, `uniprotId` or `pdbId`, and may
carry its own `initialTranscriptResidues`, `initialResidues` or
`initialSelection`, a `mappedEntityId`, and a `feature` and
`userProvidedTranscriptSequence` of its own where the launch-wide ones do not
apply. The top-level `url`/`uniprotId`/`pdbId` is the one-structure shorthand
for it. [Residue numbering](residue-numbering.md) covers how a residue number in
a spec becomes a position in the file.

```
https://jbrowse.org/code/jb2/latest/?config=/ucsc/hg38/config.json&session=spec-{"views":[{"type":"ProteinView","structures":[{"uniprotId":"P04637"},{"pdbId":"1TUP"}],"transcriptId":"NM_000546.6","connectedView":{"assembly":"hg38","loc":"chr17:7,668,421-7,687,550","tracks":["hg38-ncbiRefSeqCurated","hg38-clinvarMain"]}}]}
```

## From code

The same arguments go to the extension point directly:

```typescript
pluginManager.evaluateExtensionPoint('LaunchView-ProteinView', {
  session,
  uniprotId: 'P04637',
  transcriptId: 'NM_000546.6',
  connectedView: {
    assembly: 'hg38',
    loc: 'chr17:7,668,421-7,687,550',
    tracks: ['ncbiRefSeqCurated', 'clinvar'],
  },
})
```

The launch is async and notifies the session on failure rather than throwing.
`pnpm test:docs` opens the standalone and connected specs above in a headless
browser, and the `Daily` workflow runs it, so a dead AlphaFold URL or a broken
launch path shows up as a failed nightly.
