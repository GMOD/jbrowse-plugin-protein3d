# UniProt feature tracks

The protein view draws UniProt's annotation of the structure's protein —
domains, sites, variants — as tracks under the alignment (`useUniProtFeatures`).
Each track needs two things: the UniProt accession, and how UniProt positions
line up with the structure's own residue numbering. Where each comes from
depends on the kind of structure.

## AlphaFold DB models

The filename answers both. The URL carries the accession, and the model _is_ the
UniProt sequence, so UniProt position `p` is structure position `p - 1`.

## PDB entries

The URL answers neither. It has no accession, and the deposited construct is
usually a fragment, often tagged or engineered, so the numbering is offset —
1TUP's p53 chain starts at UniProt 94, 6VXX's spike has SEQRES 33 = UniProt 14,
and the offset is not even constant across a construct.

The plugin resolves both from [SIFTS](https://www.ebi.ac.uk/pdbe/docs/sifts/)
via PDBe's `mappings/uniprot/{pdbId}` API (p2s_mapper's `pdbUniProtMapping.ts`,
read here by `structureUniProt.ts`), which gives a per-segment correspondence.
It uses only the segments for the entity it mapped to the transcript: a
heteromer maps each chain to a different accession, so the wrong one would
annotate the wrong protein. `residue_number` in that API is the 1-based
SEQRES/`label_seq_id` index, i.e. this plugin's structure position + 1.

The plugin infers a PDB id only from URLs on the PDB archive hosts, so a
user-supplied model named `1abc.cif` can't inherit that entry's annotations.

## Your own models

A model you folded yourself has neither an accession nor SIFTS. A `uniprotId`
beside its `url` supplies the accession:

```js
{ url: 'https://example.org/folds/TP53_model_0.cif', uniprotId: 'P04637' }
```

`url` still decides which file opens. The plugin then treats the model like an
AlphaFold DB one and places UniProt position `p` at residue `p`, so only add the
accession to a full-length model of the canonical UniProt sequence numbered
from 1. For a domain, a construct or another isoform, leave it off: no tracks is
better than tracks drawn on the wrong residues.
[Your own structures](your-own-structures.md) covers the rest of that route.

## What the tracks show

The tracks drop a feature outside the modeled region rather than draw it at a
misleading residue. The feature tooltip names both numberings when they differ,
so a bar reading "UniProt position 102-292" on a fragment also says which
structure residues it covers. None of this affects the genome mapping, which
comes from aligning the transcript's translation either way;
[residue numbering](residue-numbering.md) follows one residue through every
numbering involved.
