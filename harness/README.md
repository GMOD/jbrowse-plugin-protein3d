# PDB ↔ transcript mapping harness

A standalone web app that loads real PDB / AlphaFold structures through the
plugin's **actual** molstar path (`addStructureFromURL` → `createModel` →
`extractEntities`), the plugin's **actual** entity resolution
(`chooseMappedEntity`) and the plugin's **actual** alignment
(`runLocalAlignment`, `structureSeqVsTranscriptSeqMap`), then reports what it
would really map and flags the biological cases that stay hazardous.

Faithfulness is the whole point, and it is easy to lose: this page used to
hardcode "the plugin maps entity [0]", which was true when written. Once
`chooseMappedEntity` shipped, the page went on reporting `WRONG_CHAIN` for every
heteromer the plugin had started handling correctly. It now calls the plugin's
own resolver, so it cannot drift that way again — and `WRONG_CHAIN` became a
regression alarm instead of a known bug.

## Two ways to exercise the plugin

- **Fast verdict (this page):** click an example to run the plugin's mapping
  code in isolation and get the entity table + verdicts immediately.
- **Real plugin end-to-end:** each example's **↗ JBrowse** link opens its gene
  in the live `webgl-poc` JBrowse build (`jbrowse.org/code/jb2/webgl-poc`) using
  the `config.json` served next to this page (`public/config.json`). Right-click
  the gene → _Launch protein view_ → enter the PDB ID to watch the linked
  genome↔structure mouseover in the actual plugin.

  A structure can also be launched declaratively, without the dialog, via the
  `LaunchView-ProteinView` extension point — `pdbId` for an RCSB entry or
  `uniprotId` for an AlphaFold model, plus a `transcriptId` and a
  `connectedView`. See [DEVELOPERS.md](../DEVELOPERS.md).

## Run

```
node_modules/.bin/vite --config harness/vite.config.mts
```

Open http://localhost:5180.

## What it shows

For a chosen structure + transcript (paste a sequence or fetch by UniProt acc):

- **Polymer entity table** — every chain/entity, its length, how many residues
  are actually modeled, % identity and transcript coverage. The row the plugin
  resolves (via `chooseMappedEntity`) and the row that _best_ matches the
  transcript are highlighted; they should agree.
- **Verdicts** flagging:
  - `RESOLVED_CHAIN` — the protein of interest is **not** entity `[0]` and
    `chooseMappedEntity` found the right one. The case that used to mis-map.
  - `WRONG_CHAIN` — the resolver did **not** pick the best-matching entity. A
    regression alarm: no built-in example should produce this.
  - `MULTI_ENTITY` — heteromeric complex; hovers on the other chains are dropped
    rather than mapped through the wrong alignment.
  - `AUTHOR_NUMBERING` — the entity's `label_seq_id`s don't run `1..N`, so a
    residue id is not `position + 1`. Happens with PDB-format files that carry
    no SEQRES records, where molstar reports the author numbering instead.
  - `DISORDER_DRIFT` — unmodeled residues make the confidence/B-factor track
    drift out of register. Hovers and highlights are unaffected: they address
    residues by real `label_seq_id`.
  - `PARTIAL_OR_REPEAT` — a domain/fragment; local alignment may anchor to the
    wrong copy in repeat proteins.
  - `AF_FRAGMENT` — AlphaFold URLs are hardcoded to `F1`.
- **Coordinate-map sample** — the real `structureSeqToTranscriptSeqPosition` map
  the plugin would build for the resolved entity.

## Examples

Built-in examples live in `examples.ts`, each grounded against the RCSB data API
and tagged with the verdict it should produce:

| example                                   | what it shows                                               |
| ----------------------------------------- | ----------------------------------------------------------- |
| AF p53                                    | `CLEAN` — single chain, full length                         |
| 4HHB → β / 1FIN → cyclin A / 6M0J → spike | `RESOLVED_CHAIN` — protein of interest isn't entity [0]     |
| 1TUP → p53                                | `RESOLVED_CHAIN` — entity [0] and [1] are DNA strands       |
| 1TUP.pdb → p53                            | PDB format rather than mmCIF; the author-numbering path     |
| 6M0J → ACE2                               | `MULTI_ENTITY` contrast — [0] is right, but still a complex |
| 1TIT / 1N11 / 4INS                        | `PARTIAL_OR_REPEAT` — domain/fragment & repeat anchoring    |
| AF BRCA2                                  | `AF_FRAGMENT` — >2700 aa, only F1 loaded                    |

To add one: find a PDB's entities at
`https://data.rcsb.org/rest/v1/core/polymer_entity/<PDBID>/<n>`, note which is
entity [0] and which UniProt you care about, and append a row to `EXAMPLES`. Set
`format: 'pdb'` to load the PDB-format file instead of mmCIF.
