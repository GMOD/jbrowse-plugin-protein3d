# Figure session properties

A session can fix everything a structure figure needs, so a capture or a shared
link opens on the same picture every time.

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

## View properties

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
  loads in this spelling; one whose marks or distances still do not read is
  refused with the reason.
- `distances`: a dashed line between the nearest atoms of two sites, labelled in
  Å, with an optional `encoding.color.value`.

## Composing a figure from a script

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
  [reading the view](reading-the-view.md)); read `currentCamera()` afterwards to
  keep that framing.

## Structure properties

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

## Labels

A session highlight labelled as a protein change, such as `E46K`, keeps that
name on the genome band and reads, on each structure, as the residue that
structure has there: `Glu46` on wild type, `Lys46` on the mutant.

Under `color: { field: 'mappedChain' }` a bound ligand draws orange;
crystallization additives (glycerol, sulfate, PEG and the like) stay grey.
