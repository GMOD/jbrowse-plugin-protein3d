# PDB ↔ transcript mapping harness

A standalone web app that loads real PDB / AlphaFold structures through the
plugin's **actual** molstar path (`addStructureFromURL` → `createModel` →
`extractStructureSequences`) and the plugin's **actual** alignment
(`runLocalAlignment`, `structureSeqVsTranscriptSeqMap`), then surfaces the
biological cases the plugin mishandles.

## Run

```
node_modules/.bin/vite --config harness/vite.config.mts
```

Open http://localhost:5180.

## What it shows

For a chosen structure + transcript (paste a sequence or fetch by UniProt acc):

- **Polymer entity table** — every chain/entity, its length, how many residues
  are actually modeled, % identity and transcript coverage. The row the plugin
  uses (entity `[0]`) and the row that *best* matches the transcript are
  highlighted.
- **Verdicts** flagging:
  - `WRONG_CHAIN` — the transcript matches an entity other than `[0]`, so every
    genome↔structure mapping is wrong.
  - `MULTI_ENTITY` — heteromeric complex; hovers on non-`[0]` chains mis-map.
  - `DISORDER_DRIFT` — unmodeled residues make the confidence/B-factor track
    drift out of register with `label_seq_id`.
  - `PARTIAL_OR_REPEAT` — a domain/fragment; local alignment may anchor to the
    wrong copy in repeat proteins.
  - `AF_FRAGMENT` — AlphaFold URLs are hardcoded to `F1`.
- **Coordinate-map sample** — the real `structureSeqToTranscriptSeqPosition`
  map the plugin would build for entity `[0]`.

Try the built-in examples (6M0J, 4HHB, 1IGT, AF BRCA1) to see each verdict fire.
