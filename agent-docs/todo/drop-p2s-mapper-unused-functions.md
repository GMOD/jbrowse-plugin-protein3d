---
name: drop-p2s-mapper-unused-functions
description:
  Drop p2s_mapper's toAuthorRange and segmentsForAccession at its next major
  version.
metadata:
  category: ready
  area: p2s_mapper
  first_move: 'Delete both functions when cutting the next major.'
  order: 4
---

p2s_mapper's `toAuthorRange` and `segmentsForAccession` have had no consumer
since jb2hubs switched to `initialTranscriptResidues` (2026-09-25). Drop them at
its next major version.
