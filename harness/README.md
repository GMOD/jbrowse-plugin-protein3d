# PDB ↔ transcript mapping harness

A standalone web app that loads real PDB / AlphaFold structures through the
plugin's **actual** molstar path (`addStructureFromURL` → `createModel` →
`extractStructureSequences`) and the plugin's **actual** alignment
(`runLocalAlignment`, `structureSeqVsTranscriptSeqMap`), then surfaces the
biological cases the plugin mishandles.

## Two ways to exercise the plugin

- **Fast verdict (this page):** click an example to run the plugin's mapping
  code in isolation and get the entity table + verdicts immediately.
- **Real plugin end-to-end:** each example's **↗ JBrowse** link opens its gene
  in the live `webgl-poc` JBrowse build
  (`jbrowse.org/code/jb2/webgl-poc`) using the `config.json` served next to this
  page (`public/config.json`). Right-click the gene → *Launch protein view* →
  enter the PDB ID to watch the linked genome↔structure mouseover (and the
  mis-mapping) in the actual plugin.

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

## Examples

Built-in examples live in `examples.ts`, each grounded against the RCSB data API
and tagged with the verdict it should produce:

| example | what it shows |
| --- | --- |
| AF p53 | `CLEAN` — single chain, full length |
| 4HHB → β / 1FIN → cyclin A / 6M0J → spike | `WRONG_CHAIN` — protein of interest isn't entity [0] |
| 1TUP → p53 | `WRONG_CHAIN` — entity [0] is a DNA strand |
| 6M0J → ACE2 | `MULTI_ENTITY` contrast — [0] is right, but still a complex |
| 1TIT / 1N11 / 4INS | `PARTIAL_OR_REPEAT` — domain/fragment & repeat anchoring |
| AF BRCA2 | `AF_FRAGMENT` — >2700 aa, only F1 loaded |

To add one: find a PDB's entities at
`https://data.rcsb.org/rest/v1/core/polymer_entity/<PDBID>/<n>`, note which is
entity [0] and which UniProt you care about, and append a row to `EXAMPLES`.

