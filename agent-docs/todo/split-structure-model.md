---
name: split-structure-model
description: structureModel.ts is 1,650 lines; move the alignment decision and per-residue track getters out.
metadata:
  category: ready
  area: structure
  first_move: "Move the load autorun, alignInWorker and its supersede bookkeeping into their own module."
  order: 2
---

`structureModel.ts` is 1,650 lines. The alignment decision (the load autorun,
`alignInWorker` and its supersede/redecide bookkeeping) and the per-residue
track getters (`confidenceCells`, `hydrophobicityCells`) could move out; the
Mol\* side effects already live in per-concern factories (`structureLoader`,
`lociChannel`, `structureSuperposer`, `viewInteractions`).
