Open, in the order worth doing. Each was checked against the code on 2026-09-25.

- Colour the 3D structure by AlphaMissense pathogenicity: a custom Mol\*
  `ColorTheme` reading per-residue scores through the alignment, registered the
  way `mappedChainColorTheme.ts` is.

- `structureModel.ts` is 1,450 lines. The alignment-building autorun and the
  per-residue track getters (`confidenceCells`, `hydrophobicityCells`) could
  move out; the Mol\* side effects already live in per-concern factories
  (`structureLoader`, `lociChannel`, `structureSuperposer`, `viewInteractions`).

- p2s_mapper's `toAuthorRange` and `segmentsForAccession` have had no consumer
  since jb2hubs switched to `initialTranscriptResidues` (2026-09-25). Drop them
  at its next major version.
