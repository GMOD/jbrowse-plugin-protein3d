# Residue numbering: from a paper's R248 to a codon

The same amino acid has up to four numbers depending on who is counting, and the
plugin's job is to keep them straight so that a hover on the genome lights the
right atoms and a paper's "R248" lands on the right codon. This page is the map
between them, using p53 in the crystal structure
[1TUP](https://www.rcsb.org/structure/1TUP) as the worked example throughout.

## Four numberings of one residue

1TUP holds p53's DNA-binding core, residues 94 to 312 of the 393-residue
protein, so its chain starts in the middle of the sequence. The arginine that
every cancer paper calls **R248** is described four ways:

| numbering                                 | R248 in 1TUP | who uses it                                                           |
| ----------------------------------------- | ------------ | --------------------------------------------------------------------- |
| **Position**: 0-based index in the chain  | 154          | every computation in this plugin                                      |
| **`label_seq_id`**: mmCIF standard, 1..N  | 155          | Mol\* addresses residues by it; SIFTS reports it as `residue_number`  |
| **`auth_seq_id`**: what the authors wrote | 248          | papers, Mol\*'s hover label (`ARG 155 [auth 248]`), the ruler         |
| **UniProt position** on the full protein  | 248          | UniProt features, ClinVar `p.Arg248Gln`, the transcript's translation |

For an AlphaFold model all four agree apart from the 0/1 offset, because the
model covers the whole protein and is numbered from 1. That is why the mismatch
went unnoticed while the plugin only opened AlphaFold models, and why it matters
as soon as a crystal fragment is opened beside one.

Author numbering and UniProt numbering usually coincide for a well-deposited
entry, but not always: tags, engineered residues and chimeric constructs break
it, and 1YCR's p53 peptide is numbered 15 to 29 because that is the stretch of
p53 it contains. The plugin never assumes they agree; it asks SIFTS.

## What the plugin computes with

Every stored or derived coordinate is a **position**: `initialSelection`, the
clicked range, the hover, the pairwise alignment maps, feature layouts. That is
the one numbering that is guaranteed dense and zero-based whatever the file, so
it is the only one arithmetic is done in. `src/ProteinView/coordinates.ts`
brands the three internal spaces (structure position, transcript position,
alignment column) so the compiler rejects mixing them.

Two conversions leave that space, and each is done in exactly one place.

### To Mol\*: `label_seq_id` through `Entity.seqIds`

Mol\* selects and highlights residues by `label_seq_id`. It is `position + 1`
for any mmCIF with an `entity_poly_seq` category, which is all of RCSB and
AlphaFold, and for PDB files carrying SEQRES records. It is **not** for a
SEQRES-less PDB file, where Mol\* numbers the observed residues by author
numbering, so a chain starting at residue 94 has ids 94.. and an unobserved loop
leaves a hole. `extractEntities` therefore keeps the real ids per position
(`Entity.seqIds`) and every crossing goes through `toLabelSeqIds`,
`rangeToLabelSeqIds` and `makeLabelSeqIdIndex` in
`src/ProteinView/extractStructureSequences.ts`. Adding 1 anywhere else is the
bug this replaced.

### To the user: `auth_seq_id` through `Entity.authSeqIds`

The ruler under the alignment and the hover line in the header show author
numbering, read from the atomic hierarchy when the structure loads. A residue
with no atoms has no `auth_seq_id` of its own, so `fillAuthSeqIds` gives it the
offset of the nearest observed residue before it, which keeps a disordered loop
counting the way the paper does. A file with no atomic hierarchy falls back to
`label_seq_id`, which for a SEQRES-less PDB is already the author numbering.
`residueNumber(entity, position)` is the single accessor.

This is display only. Changing what the ruler says changed nothing about what is
selected or sent to Mol\*.

## Naming a residue in a session spec

A spec can seed the selection two ways, per structure:

```json
{ "pdbId": "1TUP", "initialResidues": { "start": 248, "end": 248 } }
{ "pdbId": "1TUP", "initialSelection": { "start": 154, "end": 155 } }
```

`initialResidues` is inclusive author numbering, the way a site is cited.
`initialSelection` is the 0-based half-open position range, for callers that
already computed one. Both light the same residue: magenta in Mol\*, a band on
the connected genome view, a box in the alignment.

`initialResidues` cannot be resolved when the snapshot is read, because the
numbering lives in the file. The structure model waits (a MobX `when`) until the
entities are loaded **and** the transcript's entity has been chosen, then
converts through `residueRangeToPositions`. The second condition matters: before
the alignment picks the p53 chain, the fallback entity is `entities[0]`, which
in 1TUP is a DNA strand. The seed fires once, so a user who clears the selection
afterwards is not overruled. A range the fragment does not contain selects
nothing rather than something else.

## Placing UniProt features on a fragment

UniProt annotates the full-length protein. To draw the DNA-binding region on
1TUP the plugin needs the accession, which for a PDB entry is not in the URL,
and the offset between UniProt and structure numbering, which is not constant
across a construct. Both come from
[SIFTS](https://www.ebi.ac.uk/pdbe/docs/sifts/) via PDBe's
`mappings/uniprot/{pdbId}` endpoint (`src/ProteinView/pdbUniProtMapping.ts`).
Only the segments for the entity mapped to the transcript are used, so a
heteromer annotates the right chain, and a feature outside the modeled region is
dropped rather than drawn at a misleading residue. AlphaFold models skip SIFTS:
the accession is in the filename and UniProt position `p` is position `p - 1`.

The feature tooltip names both numberings when they differ, so a bar reading
"UniProt position 102-292" on a fragment also says which structure residues it
covers.

## The whole chain, hover on the genome to atoms in Mol\*

1. `session.hovered` gives a 1-based display coordinate on some reference; the
   transcript's `refName` must match or the hover is ignored (a numerically
   overlapping coordinate on another chromosome is not this protein).
2. `g2p_mapper` (0-based, half-open) turns the base into a transcript residue
   position.
3. The pairwise alignment maps transcript position to structure position, or to
   nothing if the residue sits in a gap.
4. `Entity.seqIds[position]` gives the `label_seq_id`, which `setMolstarLoci`
   selects on the mapped entity only, so a homodimer's other copies and any
   binding partner stay dark.
5. The header reads `residueNumber(position)` and says `1TUP: 248, ...`.

The click path runs the same chain in reverse from a Mol\* pick, whose
`label_seq_id` is converted back to a position through `makeLabelSeqIdIndex`,
then through the alignment to a transcript position and through `p2gCodon` to
the codon's genome span, which is what the genome view is navigated to.

## Numbers verified on real files

Measured on the hosted nightly with the TP53 session from the tutorial:

| structure          | position 0 | position 154 |
| ------------------ | ---------- | ------------ |
| AlphaFold P04637   | 1          | 155          |
| 1TUP (p53 core)    | 94         | 248          |
| 1YCR (p53 peptide) | 15         | 155          |

The e2e suite pins the 1TUP row: `initialResidues: { start: 248, end: 248 }`
resolves to positions 154..155 and the ruler under the panel carries a 250 tick.

## Related

- [DEVELOPERS.md](../DEVELOPERS.md) for the spec and extension-point parameters.
- `CLAUDE.md` for the coordinate conventions in the terms the code uses.
- The [TP53 tutorial](https://jbrowse.org/jb2/docs/tutorials/tp53_structures)
  walks the same structures from the user's side.
