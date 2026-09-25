Open, in the order worth doing. Each was checked against the code on 2026-09-25.

- Colour the 3D structure by AlphaMissense pathogenicity: a custom Mol\*
  `ColorTheme` reading per-residue scores through the alignment, registered the
  way `mappedChainColorTheme.ts` is.

- `structureModel.ts` is 1,650 lines. The alignment decision (the load autorun,
  `alignInWorker` and its supersede/redecide bookkeeping) and the per-residue
  track getters (`confidenceCells`, `hydrophobicityCells`) could move out; the
  Mol\* side effects already live in per-concern factories (`structureLoader`,
  `lociChannel`, `structureSuperposer`, `viewInteractions`).

- A superseded alignment still runs to the end in the RPC worker; only its
  answer is dropped. Rapid chain picks on a large complex queue several DPs
  ahead of the one that counts. Cancelling needs `stopToken` on v4 hosts and
  `signal` on v5, and a DP loop that checks one.

- p2s_mapper's `toAuthorRange` and `segmentsForAccession` have had no consumer
  since jb2hubs switched to `initialTranscriptResidues` (2026-09-25). Drop them
  at its next major version.
