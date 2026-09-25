Open, in the order worth doing. Each was checked against the code on 2026-09-25.

- The launch dialog ranks isoforms on the main thread (`classifyIsoforms` in
  `TranscriptSelector`, `selectBestTranscript` in `useTranscriptSelection`), one
  DP per non-identical isoform. The view's own alignment moved to the RPC worker
  on 2026-09-25; this is the last main-thread DP. The 40M-cell cap only bites
  titin against a chain over ~1,160 residues, so lifting it is not worth a
  p2s_mapper release on its own.

- Colour the 3D structure by AlphaMissense pathogenicity: a custom Mol\*
  `ColorTheme` reading per-residue scores through the alignment, registered the
  way `mappedChainColorTheme.ts` is.

- `structureModel.ts` is 1,450 lines. The alignment-building autorun and the
  per-residue track getters (`confidenceCells`, `hydrophobicityCells`) could
  move out; the Mol\* side effects already live in per-concern factories
  (`structureLoader`, `lociChannel`, `structureSuperposer`, `viewInteractions`).

- The e2e's `05-dialog-ready` capture on v4.3.0 fires when Launch enables,
  before the host's lazily served MUI chunks paint, so the UniProt table and
  links are blank in it; they arrive within 4 s. A capture that waits for the
  table row would keep a regenerated reference image honest.

- p2s_mapper's `toAuthorRange` and `segmentsForAccession` have had no consumer
  since jb2hubs switched to `initialTranscriptResidues` (2026-09-25). Drop them
  at its next major version.
