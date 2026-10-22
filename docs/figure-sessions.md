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

## View properties

- `camera`: position, target and up in the structure file's coordinates. `mode`
  is `perspective` or `orthographic`; `radius` clips to a slab that deep either
  side of the target.
- `surface`: a translucent molecular surface over each polymer, colored as the
  cartoon is.
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
  too. A bare `G` is the component, every guanine. A `site` is an address in the
  structure's own numbering, the one `distances` and figure anchors use, not a
  field predicate. A session whose marks or distances do not read this way is
  refused with the reason, the older `style` and string `color` included.
- `distances`: a dashed line between the nearest atoms of two sites, labelled in
  Å, with an optional `encoding.color.value`.

## Structure properties

- `chains`: author chain ids to draw, such as one rung of a fibril or one copy
  of a homo-oligomer. The rest stay loaded and mapped but are not drawn.

## Labels

A session highlight labelled as a protein change, such as `E46K`, keeps that
name on the genome band and reads, on each structure, as the residue that
structure has there: `Glu46` on wild type, `Lys46` on the mutant.

Under `color: { field: 'mappedChain' }` a bound ligand draws orange;
crystallization additives (glycerol, sulfate, PEG and the like) stay grey.
