---
name: todo
description:
  Index of the open action items in todo/, grouped by what to do first. Read
  when picking up work, and before filing anything new here.
---

# Todo

One file per item under [todo/](todo/). Each carries its table row in its own
frontmatter: `metadata.category` picks the table, `area` and `first_move` are
the columns, `order` is where it sits. This index has no generator, so add or
remove a row here when you add or remove an entry.

Commitment, not size, separates an item here from a proposal in
[ideas/](ideas/).

Live unfinished state sits in [handoffs/](handoffs/).

## Ready to take

| Item                                                                         | Area       | First move                                                                    |
| ---------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| [AlphaMissense structure colour](todo/alphamissense-structure-colour.md)     | colour     | Write a Mol\* `ColorTheme` reading per-residue scores through the alignment.  |
| [Split structureModel.ts](todo/split-structure-model.md)                     | structure  | Move the load autorun, `alignInWorker` and its supersede bookkeeping out.     |
| [Cancel superseded alignments](todo/cancel-superseded-alignment.md)          | alignment  | Add a stop check to the DP loop, wired to `stopToken` (v4) and `signal` (v5). |
| [Drop unused p2s_mapper functions](todo/drop-p2s-mapper-unused-functions.md) | p2s_mapper | Delete both functions when cutting the next major.                            |
