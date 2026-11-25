# Sessions: saved views and reproducible figures

A session is the whole of a view, saved as properties. A saved session restores
a ProteinView as it was, and the same properties can fix a figure so a capture
or a shared link opens on the same picture every time.

- [Saved views](#saved-views): the snapshot shape, shorthands, chain choice
- [Figures](#figures): camera, surface, marks and distances

## Saved views

A full session snapshot restores a ProteinView directly from its own model
properties, with none of the resolution a [session spec](launching.md) does.

- **In:** a deflated `session=` URL, a `defaultSession` or a saved session file
- **Out:** the view as saved, with every setting it names
- **Emitted by:** the gene-explorer (`react-msaview/website`) and `jb2hubs` apps

### Settings sit flat on the view

- ProteinView takes every setting directly on the view object and never had an
  `init` key.
- JBrowse 5 asks the same of every view type and warns about a snapshot that
  nests settings under `init`, the JBrowse 4 spelling, so keep the genome view's
  settings flat too.

```jsonc
{
  "type": "ProteinView",
  "height": 500,
  "zoomToBaseLevel": false,
  "structures": [
    {
      "url": "https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif",
      "connectedViewId": "lgv-1", // links to a LinearGenomeView by id
      "feature": {
        /* serialized transcript, see launching.md "Feature shape" */
      },
      "userProvidedTranscriptSequence": "MEEP…", // optional; '' = use structure's own
      "initialSelection": { "start": 338, "end": 350 }, // optional pre-lit domain
    },
  ],
}
```

- Cross-view wiring is by declared id (`connectedViewId`) and a shared
  `feature`, so no imperative wiring code is needed.
- An MsaView connected to the same genome view links to the structure with no id
  of its own: a hover in either lights the other through the codon it maps to.
- `src/ProteinView/proteinViewSpec.ts` holds the typed spec and its snapshot
  builder (`ProteinViewSpec` / `proteinViewSnapshot`). Every launch path funnels
  through that one builder, so they cannot drift into different property
  subsets.

### Structure shorthand: `uniprotId` and `pdbId`

Instead of a full `url`, a structure may give a `uniprotId` (an AlphaFold model)
or a `pdbId` (an RCSB mmCIF):

```jsonc
{ "type": "ProteinView", "structures": [{ "uniprotId": "P04637" }] }
```

- `pdbId` resolves to `<pdbId>.cif` at hydration and is not stored.
- The view stores `uniprotId`. The structure loader asks AlphaFold DB's
  prediction API which of the accession's files to open, then fills in `url`.
- It opens the accession's own model: `P04637` opens the canonical model even
  beside an isoform's transcript, and `P04637-4` opens that isoform's.
- An accession AlphaFold DB folded as isoforms alone opens the isoform model
  folded from exactly the transcript's translation, else the longest.
- A spelled `AF-<id>-F1-model_v6.cif` is only the fallback for an unreachable
  API: dystrophin has fourteen isoform models and no F1 fragment, and the model
  version moves under every config already published.
- A `gene` launch picks the transcript's own model, an isoform's for an isoform
  transcript, and writes it as `url` on the structure the launch leaves to the
  gene: when the launch names no structure, or only a `uniprotId` on the launch
  itself.
- Every entry of `structures` names its own source, so
  `{ "gene": "TP53", "transcriptId": "NM_001126118.2", "structures": [{ "uniprotId": "P04637" }] }`
  opens the canonical model AF-P04637-F1 and aligns the isoform's transcript to
  it.
- An explicit `url` or `data` always wins over both shorthands, and a
  `uniprotId` beside it names the protein for the UniProt tracks instead
  ([UniProt feature tracks](uniprot-feature-tracks.md) covers when that is
  safe).
- The shorthand only sets the structure; it does **not** build the genome to
  protein connection. For that use a session spec's `transcriptId`.

### Which chain maps

- A structure with several polymer chains maps the transcript to the protein
  chain with the most identical residues over the shorter of transcript and
  chain. A short peptide beats the long partner it is bound to, and a fusion
  construct still wins on the chain that holds the whole transcript.
- DNA and RNA chains are never candidates.
- `mappedEntityId` (an mmCIF entity id, `"1"`, `"2"`, …) overrides that choice.
  The chain picker on the structure's header row writes it, so a saved session
  restores the chain the user chose along with the alignment computed against
  it.
- A snapshot can also carry its own `pairwiseAlignment`, transcript row first,
  each row spelling its whole sequence with `-` for gaps. The plugin maps it to
  the chain whose sequence the second row spells; `mappedEntityId` then only
  picks among chains that share that sequence.
- When no chain matches, the view reports that on its banner and recomputes the
  alignment, against the `mappedEntityId` chain when that is a protein chain and
  by the rule above otherwise. A session saved before 0.11.1 can hit this,
  because its alignment was computed from a sequence that spelled modified
  residues out.
- [Genome to structure alignment](genome-to-structure-alignment.md) has the
  measurements behind the rule.

### Stored preferences

- The view keeps six preferences in localStorage: `showAlignment`,
  `showProteinTracks`, `showAllFeatureTracks`, `compactTracks`,
  `autoScrollAlignment` and `showControls`.
- A stored preference only fills a setting the snapshot does not name, so an
  explicitly declared value always wins, even when it equals the property
  default.
- Every other setting, `showHighlight` and `zoomToBaseLevel` among them, stays
  with its view.

### The 1D annotation view

A LinearGenomeView launched as a 1D protein-annotation view carries a
`proteinLinkage` property: the `connectedViewId` of the genome view it came
from, the transcript `feature`, and the `uniprotId`.

- The plugin adds the property to every LinearGenomeView, so a hand-authored
  snapshot can set it and the 1D to genome hover highlight works after a reload
  or from a shared session.
- The snapshot carries no alignment. Each time the view opens, the plugin
  translates the transcript and aligns it to the sequence of the UniProt entry
  the view shows, so an isoform's residues land on their own codons: the Δ133
  isoform of p53 maps 132 residues into P04637.
- A residue with no counterpart on the other side lights nothing, and an entry
  too dissimilar to the transcript is not linked at all.

Its tracks:

- The view opens with every track it has: UniProt features with a section per
  feature type, antigen, AlphaMissense scores, AlphaFold confidence when the
  entry has a model, and ClinVar when the view is linked to a transcript on hg38
  or hg19.
- Each track's whole configuration is stored on the track inside the view's
  snapshot, under a trackId prefixed with the view's id, so a saved or shared
  session restores the tracks with the view and closing the view removes them.
- The ClinVar track is every missense substitution NCBI's ClinVar VCF classifies
  on the linked transcript, read by range over its coding span and translated on
  the genome under it. Each is placed on the entry residue its transcript
  residue aligns to, the same alignment the hover link uses.
- The ClinVar features ride inline in the track's configuration, so a saved
  session shows the calls as they were when it was launched.
- The session's own track list holds none of the 1D view's tracks, so the track
  selector does not list them and a closed one cannot be reopened from there.
  Launch the 1D view again to get a closed track back.
- A snapshot names no accession or numbering for the UniProt tracks; the plugin
  derives both when the structure loads, from the AlphaFold filename or from
  SIFTS. [UniProt feature tracks](uniprot-feature-tracks.md) explains how.

## Figures

A session can fix everything a structure figure needs.

- **In:** a ProteinView snapshot with the properties below
- **Out:** the same camera, drawing and annotations on every load and on Reset
  Zoom

```jsonc
{
  "type": "ProteinView",
  "structures": [
    { "pdbId": "9s9o", "chains": ["A"], "feature": {/* transcript */} },
  ],
  "camera": {
    "position": [74.7, 116.7, -65.4],
    "target": [91.1, 94.2, -46.2],
    "up": [-0.85, -0.2, 0.49],
    "mode": "orthographic",
  },
  "surface": { "opacity": 0.55 },
  "silhouettes": true,
  "occlusion": true,
  "marks": [
    {
      "site": "A:220",
      "mark": "sticks",
      "encoding": { "color": { "value": "#d1007a" } },
    },
    {
      "site": "A1JMR",
      "mark": "sticks",
      "encoding": { "color": { "value": "#f28e2b" } },
    },
  ],
  "distances": [{ "a": "A:46@NZ", "b": "A:80@NZ" }],
}
```

A launch takes the same properties beside `gene`, so one spec opens a gene's
structure as a figure without a serialized transcript:

```jsonc
{
  "type": "ProteinView",
  "gene": "TP53",
  "marks": [{ "site": "A:248", "mark": "spheres" }],
  "silhouettes": true,
}
```

### View properties

- `camera`: position, target and up in the structure file's coordinates. `mode`
  is `perspective` or `orthographic`; `radius` clips to a slab that deep either
  side of the target. A camera that does not place the eye, such as a point that
  is not three numbers, is refused with the reason.
- `surface`: a translucent molecular surface over each polymer, colored as the
  cartoon is; `opacity` is 0 to 1.
- `silhouettes`: outlines around every object.
- `occlusion`: ambient occlusion, which darkens crevices and folds so a cartoon
  reads as depth; with `silhouettes`, Mol\*'s illustrative look.
- `marks`: sites drawn on their own, on any chain. A site is a residue (`B:11`),
  an atom of one (`A:248@NH2`), a component id (`A1JMR`) or a whole chain
  (`G:*`); `structure` indexes `structures`; `mark` is `spheres`, `sticks` or
  `cartoon`, and `encoding.color.value` its color, the mark display's spelling.
  A `cartoon` mark of a chain left out of `chains` draws a partner protein, such
  as a virus's envelope protein, in its own color: its polymer only, where a
  chain site drawn as `spheres` or `sticks` takes the chain's glycans and waters
  too. A bare `G` is the component, every guanine. `label` writes text beside
  the site, in the mark's color on a white ground, such as a gene's name on its
  chain (`{ "site": "A:*", "mark": "none", "label": "VHL" }`); `mark: "none"`
  draws the label alone. A `site` is an address in the structure's own
  numbering, the one `distances` and figure anchors use, not a field predicate.
  A session written with the older `style` and string `color` (1.23 and 1.24)
  loads in this spelling; one whose marks or distances still do not read, or
  name a structure the view lacks, is refused with the reason. A site the loaded
  structure does not have draws nothing and shows a notice above the view.
- `distances`: a dashed line between the nearest atoms of two sites, labelled in
  Å, with an optional `encoding.color.value`.

### Composing a figure from a script

An agent or a script sets the same properties on an open view with
`view.applyFigure(change)`, and reads back the camera a person arranged with
`view.currentCamera()`:

```js
const view = jb.view(viewId)
const saved = view.currentCamera()
view.applyFigure({
  camera: { ...saved, radius: 20 },
  marks: [{ site: 'A:248', mark: 'spheres' }],
  silhouettes: true,
})
```

- `applyFigure` takes any of `camera`, `surface`, `marks`, `distances`,
  `silhouettes` and `occlusion`, spelled as above, and leaves the ones it does
  not name. A key given as `undefined` clears it: `{ marks: undefined }` draws
  no marks, `{ silhouettes: undefined }` turns the outlines off.
- The change is checked the way a snapshot is, and refused whole, naming every
  reason, if any of it does not read: a mark site that does not parse, a camera
  point that is not three numbers, a surface opacity outside 0 to 1, a key that
  is not one of the six.
- Each property is a session property, so a change is saved with the session,
  shared in its link, and undone like any other edit.
- The camera moves when `camera` changes, not only at load, and Reset Zoom
  returns to it. Mol\* animates the move, so read the camera once it has landed.
  `{ camera: undefined }`, or an undo that clears it, hands the camera back to
  Mol\*: its default projection and the canvas's own fog return, the scene is
  framed whole, and a structure added later is framed again.
- `currentCamera()` returns the camera on screen as a `camera` value, so
  `view.applyFigure({ camera: view.currentCamera() })` keeps the view as it is.
  Its `radius` is the slab Mol\* clips to, left out when that is the whole
  scene; a camera with a `radius` draws without fog. It throws while Mol\* has
  no canvas.
- To frame residues rather than write a camera,
  `structure.focusResidues(target)` selects them and turns the camera to them,
  taking the selection forms `locateResidues` takes (see
  [reading the view](launching.md#reading-the-result)); read `currentCamera()`
  afterwards to keep that framing.

### Structure properties

- `chains`: author chain ids to draw, such as one rung of a fibril or one copy
  of a homo-oligomer. The rest stay loaded and mapped but are not drawn.
- `filter`: which residues of those chains to draw, as a list of field
  predicates, the spelling a JBrowse display's own `filter` takes. CCR5's Δ32
  allele frameshifts after residue 184, so
  `{ "pdbId": "6meo", "chains": ["B"], "filter": [{ "field": "residue", "lte": 184 }] }`
  draws what the truncation leaves, beside a structure of the whole receptor.
  - Fields: `residue`, the author residue number (`auth_seq_id`) a paper cites
    and `marks` address, and `chain`, the author chain id (`auth_asym_id`)
    `chains` lists.
  - Operators: `equal`, `lt`, `lte`, `gt`, `gte`, `range` (`[low, high]`, both
    ends included) and `oneOf`. `chain` is a string, so it takes `equal` and
    `oneOf` alone.
  - A structure draws the residues every predicate passes, and `chains` is one
    more test beside them: `chains: ["B"]` with `{ field: "residue", lte: 184 }`
    draws residues 1-184 of B and nothing else.
  - The residues it leaves out are not drawn at all, as a chain left out of
    `chains` is not: a session highlight on one draws nothing rather than
    spheres in empty space. They stay loaded, mapped and selectable, so the
    alignment panel, the genome mapping and `marks` read the whole structure.
  - A bound ligand is numbered in the same author series as the polymer, well
    above its last residue, so an `lte` bound leaves the ligand out too.
  - A filter that does not read is refused with the reason, naming the structure
    and the predicate.

### Labels

A session highlight labelled as a protein change, such as `E46K`, keeps that
name on the genome band and reads, on each structure, as the residue that
structure has there: `Glu46` on wild type, `Lys46` on the mutant.

Under `color: { field: 'mappedChain' }` a bound ligand draws orange;
crystallization additives (glycerol, sulfate, PEG and the like) stay grey.
