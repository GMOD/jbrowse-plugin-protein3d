# Session snapshots

A full session snapshot — a deflated `session=` URL, a `defaultSession`, or a
saved session file — restores a ProteinView directly from its own model
properties, with none of the resolution a [session spec](launching.md) does. The
gene-explorer (`react-msaview/website`) and `jb2hubs` apps emit this form.

## Every setting at the top level

ProteinView takes every setting directly on the view object, and never had an
`init` key. JBrowse 5 now asks the same of every view type and warns about a
snapshot that nests settings under `init`, the JBrowse 4 spelling, so a
hand-written snapshot should keep its settings flat for the genome view as well.

```jsonc
{
  "type": "ProteinView",
  "height": 500,
  "zoomToBaseLevel": false,
  "structures": [
    {
      "url": "https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif",
      "connectedViewId": "lgv-1", // links to a LinearGenomeView by id
      "feature": {
        /* serialized transcript, see launch-parameters.md "Feature shape" */
      },
      "userProvidedTranscriptSequence": "MEEP…", // optional; '' = use structure's own
      "initialSelection": { "start": 338, "end": 350 }, // optional pre-lit domain
    },
  ],
}
```

Cross-view wiring is by declared id (`connectedViewId`) and a shared `feature`,
so no imperative wiring code is needed. An MsaView connected to the same genome
view links to the structure with no id of its own: a hover in either lights the
other through the codon it maps to. `src/ProteinView/proteinViewSpec.ts` holds
the typed spec and its snapshot builder (`ProteinViewSpec` /
`proteinViewSnapshot`), and every launch path funnels through that one builder
so they can't drift into different property subsets.

## Structure shorthand: `uniprotId` / `pdbId`

Instead of a full `url`, a structure may give a `uniprotId` (→ AlphaFold model)
or `pdbId` (→ RCSB mmCIF):

```jsonc
{ "type": "ProteinView", "structures": [{ "uniprotId": "P04637" }] }
```

`pdbId` resolves to `<pdbId>.cif` at hydration and is not stored. The view
stores `uniprotId`, and the structure loader asks AlphaFold DB's prediction API
which of the accession's files to open, then fills in `url`. It picks the model
folded from exactly the transcript's translation where one exists — so an
isoform launch maps as an identity — else the canonical model, else the longest
isoform. A spelled `AF-<id>-F1-model_v6.cif` is only the fallback for an
unreachable API: dystrophin has fourteen isoform models and no F1 fragment, and
the model version moves under every config already published.

An explicit `url` or `data` always wins over both shorthands, and a `uniprotId`
beside it names the protein for the UniProt tracks instead
([UniProt feature tracks](uniprot-feature-tracks.md) covers when that is safe).
The shorthand only sets the structure; it does **not** build the genome↔protein
connection — for that use a session spec's `transcriptId`.

## Which chain maps

A structure with several polymer chains maps the transcript to the protein chain
with the most identical residues over the shorter of transcript and chain, so a
short peptide beats the long partner it is bound to and a fusion construct still
wins on the chain that holds the whole transcript. DNA and RNA chains are never
candidates. `mappedEntityId` (an mmCIF entity id, `"1"`, `"2"`, …) overrides
that choice and is what the alignment panel's **Mapped chain** picker writes, so
a saved session restores the chain the user chose along with the alignment
computed against it.

A snapshot can also carry its own `pairwiseAlignment`, transcript row first,
each row spelling its whole sequence with `-` for gaps. The plugin maps it to
the chain whose sequence the second row spells; `mappedEntityId` then only picks
among chains that share that sequence. When no chain matches, the view reports
that on its banner and recomputes the alignment, against the `mappedEntityId`
chain when that is a protein chain and by the rule above otherwise. A session
saved before 0.11.1 can hit this, because its alignment was computed from a
sequence that spelled modified residues out.

[Genome to structure alignment](genome-to-structure-alignment.md) has the
measurements behind the rule.

## Stored preferences

Persisted UI preferences (`showAlignment`, `zoomToBaseLevel` and the like, in
localStorage) only fill settings the snapshot does not name, so an explicitly
declared value always wins over a sticky preference, even when it equals the
property default.

## The 1D annotation view's link back to the genome

A LinearGenomeView launched as a 1D protein-annotation view carries a
`proteinLinkage` property: the `connectedViewId` of the genome view it came
from, the transcript `feature`, and the `uniprotId`. The plugin adds the
property to every LinearGenomeView, so a hand-authored snapshot can set it and
the 1D↔genome hover highlight works after a reload or from a shared session.

## UniProt feature tracks

A snapshot names no accession or numbering for the UniProt tracks; the plugin
derives both when the structure loads, from the AlphaFold filename or from
SIFTS. [UniProt feature tracks](uniprot-feature-tracks.md) explains how, and
when a `uniprotId` beside a `url` is safe.
