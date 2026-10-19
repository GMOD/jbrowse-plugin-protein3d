---
name: ggprotein3d
description:
  An R package in the ggjbrowse/ggmsaview/ggbandage/ggtubemap mould, built on
  p2s_mapper's genome-to-residue tables, with static 3D figures and no
  htmlwidget.
---

The sibling gg packages run a viewer's own JS engine in V8 or QuickJS and draw
its tables with ggplot2. A straight port of this plugin fails that test, because
its output is an interactive Mol\* view, and R already has 3D widgets (r3dmol,
NGLVieweR). An htmlwidget is also the wrong target, because it is less
reproducible than an R graphic.

## What R lacks

p2s_mapper, which maps a transcript's codons to a structure's residues, with
chain choice, SIFTS fusion unmapping, isoform alignment, and the AlphaFold, RCSB
and Foldseek lookups.

- It imports no React, no Mol\* and no `@jbrowse/*`, so it bundles into V8.
- ggjbrowse's `R/engine.R` already answers the engine's fetches through `curl`,
  which the RCSB and AlphaFold lookups need.
- Its outputs are tables: codon ↔ residue, `auth_seq_id`, chain, pLDDT, coverage
  per entry.

## Figures

- **Static 3D picture.** The headline figure, and it brings back the sibling
  galleries' twin layout. Two routes, worth having both:
  - **Mol\* render**, the viewer's own pixels: molstar 5.13.1 ships
    `mol-plugin/util/headless-screenshot`, with `gl`, `pngjs` and `jpeg-js` as
    optional peers. It needs Node and headless-gl, so it suits the gallery's
    left column more than the package itself.
  - **ggplot projection**: Cα trace or backbone ribbon, projected
    orthographically from a fixed view and depth-sorted, colored by any mapped
    column. Vector output that facets and patchworks; the cost is cartoon
    fidelity.
- **Contact map**: `geom_raster` over a chain's residue distances, with exon
  boundaries, domains or variants along both axes. Shows distant exons that
  touch in the fold.
- **Gene model colored by structure**: pLDDT, PDB coverage or mapped chain on
  the exons.
- **Variant lollipop** on author-numbered residues of the mapped entry.

The 1D protein view is JBrowse tracks on a protein assembly; ggjbrowse already
covers it.

## The call to make

- Whether to build it at all: the mapping is solved, so only the plotting is
  new. Worth it with a concrete figure or user in mind.
- Package name: ggprotein3d fits the family; ggp2s names what it wraps.
- Whether the ggplot projection's fidelity is enough, measured by drawing TP53's
  1TUP both ways side by side.
