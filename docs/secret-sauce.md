# The secret sauce: one encoding, every view

A structure viewer colours residues, a genome browser draws tracks, and a
sequence panel shades letters. This plugin puts all three on one screen, joined
by the genome coordinate, so it can do what none of them does alone: show one
variable the same way in every view. Grammar-of-graphics terms fit the idea: a
variable (pLDDT, hydropathy, conservation) is the data, the genome → transcript
→ structure mapping is the coordinate transform, a palette with its cuts is the
scale, and the 3D cartoon, the alignment strip and the linear track are three
geoms drawing the same mapping.

This page records what the plugin already does on that principle and the ideas
that build on it, ranked, with the reason each is or isn't worth doing yet.

## What already works this way

**One scale per variable, defined once.** `PLDDT_BANDS` in
`src/ProteinView/residueTracks.ts` defines AlphaFold's four confidence bands.
The alignment strip, its legend, and the linear confidence track's colour config
(`wiggleBandColors.ts`) all read it, and the bands match Mol\*'s
`plddt-confidence` theme. The Kyte-Doolittle palette works the same way: the 3D
theme (`kyteDoolittleColorTheme.ts`) and the strip call one `hydrophobicityRgb`,
so a residue is the same colour in both.

**The legend comes from the scale, not beside it.** The header's key is the
active Mol\* theme's own `legend`, and the strip legends are built from the same
bands and stops that paint the cells. A new palette therefore can't ship with a
key that disagrees with it.

**Every cross-view link goes through the genome.** A structure hover reaches
msaview as genome highlights, and an MSA hover reaches a structure through
genome → transcript → structure (`connectedHover.ts`). No view addresses another
by column or residue index, which is why the colour ideas below can reuse the
same path.

Two failures show the principle at work. Before 2026-09-25, the menu's
"Hydrophobicity (Kyte-Doolittle)" drew Mol\*'s Wimley-White theme, which runs
green for hydrophobic where the strip runs orange, and the linear pLDDT track
drew two colours split at 50 where the other views drew four bands. Neither
failure threw an error, and a reader had no way to tell which view was right.

## Ideas, in the order worth doing

### 1. Paint any genome track onto the structure

This is the one no other tool has. A JBrowse session already holds per-base data
a structural biologist wants on the cartoon: phyloP conservation, gnomAD
constraint, ClinVar density, a user's own bigWig. Two pieces of the path already
exist:

- the plugin fetches genome data through the host's `CoreGetFeatures` RPC
  (`translateTranscripts.ts`);
- the structure model maps each residue to its codon (`p2gCodon`).

Sampling the track across each codon and taking one value per residue is the
stat (mean, or max for a constraint score). The result is a per-residue array,
drawn as an alignment-strip row with the track's own scale, and in 3D by a theme
that looks the value up by Mol\* model id and `label_seq_id`.

The hard part is the 3D theme. A Mol\* theme receives its data as serializable
params, and per-residue arrays for every structure and every NMR model do not
belong there. The theme should instead read from a registry the view owns, keyed
by model id, as `interactionPosition` already keys hovers by model id. The strip
row can ship first, since it needs none of that.

### 2. Colour the structure by the MSA's conservation

msaview's react-msaview already computes per-column conservation
(`columnCounts`, `propertyConservation`). Mapping a column to its codon is the
bridge `connectedHover` already walks for a hover, so conservation can reach the
structure along the same genome path, never by column number (see the MSA
section of CLAUDE.md for why a column-number path is wrong). Once the registry
from idea 1 exists, this is a second data source for it rather than a new
mechanism.

### 3. A windowed hydropathy row

Kyte and Doolittle read hydropathy over a sliding window: 9 residues for surface
regions, 19 for transmembrane segments. One value per residue is mostly noise,
and a 19-window row is how a transmembrane helix becomes visible. Compute the
window over the **transcript's** translation, not the structure sequence: a
structure without `entity_poly_seq` skips unobserved loops, and a window would
silently bridge the gap. Draw it as its own labelled row, since it is a
different stat from the per-residue strip.

### 4. Residue tracks as declared layers

Once ideas 1–3 exist, the hardcoded `confidenceCells` / `hydrophobicityCells`
and the `showAllFeatureTracks` switch generalize into a `residueTracks` field in
`ProteinViewSpec`: each entry names a source, a stat and a scale, and the view
draws it in the strip and offers it as a 3D colour scheme. Wait until at least
two real sources exist, so the shape comes from use rather than guesswork. A new
optional snapshot field is safe on released hosts, but it is a public spec to
maintain.

### 5. An explicit column scale

The alignment panel maps column to pixel as `col * CHAR_WIDTH` at every call
site (27 across 9 files) and inverts it by hand in three places
(`useAlignmentColumnHover.ts`, `SplitString.tsx`). A `colToPx`/`pxToCol` pair
makes zooming the panel a change of scale rather than of a constant. Worth doing
only when zoom arrives or those files are already open; on its own it changes no
pixel.

### Not recommended: one x axis across structure panels

Each structure panel has its own x, the alignment column, so R248 sits at a
different x in 1TUP's panel than in 1YCR's. A shared transcript-position axis
would line panels up like small multiples, but a structure's insertions relative
to the transcript then need a display of their own. The panels show one at a
time today, so the gain is small against a real design problem.

## Constraints every idea inherits

- **Colour config differs by host.** v4 wiggle renderers take `color` as a jexl
  callback, and evaluate it once with no feature, so an unguarded
  `get(feature, …)` shows the whole track as a TypeError. v5 takes a
  display-level `color` scale. Display-level `bicolorPivot` worked only on
  5.0.0-beta.1 to beta.8. Main removed `MultiLinearWiggleDisplay`. Check a track
  colour live on v4.0.0, v4.3.0 and main (`docs/live-checks.md`), counting
  pixels per band; the 2026-09-25 check found two configs that tsc, lint and
  unit tests passed but that showed the track as an error.
- **Scheme values are persisted.** `colorScheme` is an MST enumeration in saved
  sessions, so rename nothing; map a kept value to a new Mol\* theme, as
  `'hydrophobicity'` maps to `kyte-doolittle`.
- **Mol\* themes register per plugin.** `registerColorThemes` runs for every
  view's plugin, and a name missing from the registry paints grey silently.
- **Modified residues need the canonical sequence.** Mol\* codes MSE and TPO as
  `X`; `entity_poly.pdbx_seq_one_letter_code_can` names the parent, which is
  where the strip's letters come from. Any per-residue theme keyed by residue
  name has to read it too, or the 3D view and the strip disagree.
