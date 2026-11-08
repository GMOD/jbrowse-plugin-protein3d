# Mol\* traps, with the measurements

The rules are in `src/ProteinView/CLAUDE.md`; this page is why.

## The wrong parser fails silently in one direction

- **PDB text parsed as `mmcif`** throws in the tokenizer
  (`Unexpected token. Expected data_, loop_, or data name.`).
- **mmCIF text parsed as `pdb` does not throw.** A real RCSB `.cif` read as PDB
  produced ~5800 misread atoms and zero polymer entities; a short one produced a
  trajectory with `frameCount === 0`. The view loads with no sequence, no
  alignment and no genome mapping.

A load from inline `data` has to guess, since a snapshot has no filename, so
detection sniffs content (first non-comment line starting with `data_` ⇒ mmCIF)
in p2s_mapper's `structureFormat.ts`, as the default `parseStructureTrajectory`
applies to data and urls alike. The view, the launch dialog and the harness all
load through it; per-caller detection was the bug this replaced. A parse that
yields no frames throws, naming the parser.

## Read structures from the live state tree

`plugin.managers.structure.hierarchy` (`findStructure`, `current`, and the
component refs `updateRepresentationsTheme` takes) is a snapshot Mol\*
republishes only on some state events, and on none while a data transaction is
open anywhere in the plugin. Color, removal and superposition run the moment a
load lands, exactly when it can lag, so they find a structure's cell through
`structureRootCell` (the substructure-parent map, updated on every object event)
and walk the state tree from there. The tests that pin this load a structure
inside an open `dataTransaction`; through the snapshot, color and superposition
skipped it and removal left it in place.

## `structurePosition + 1 === label_seq_id` only sometimes

Mol\* builds a polymer entity's sequence two ways:

- **`entity_poly_seq` present** → `Sequence.ofResidueNames(mon_id, num)` over
  the full SEQRES; `num` is 1..N contiguous, so index `i` has `seqId === i + 1`.
  True for all RCSB mmCIF, all AlphaFold, and PDB files carrying SEQRES (Mol\*
  synthesizes the category from them; verified on 1TUP.pdb and 6VXX.pdb).
- **No `entity_poly_seq`** → `StructureSequence.fromHierarchy` windows
  `label_seq_id` over only the observed residues. A SEQRES-less PDB numbered
  from author residue 94 reports seqIds 94.., and an unobserved loop leaves a
  hole, so the offset is not even constant.

The second case reaches users through the "File or URL" tab (trimmed or
modeling-tool output) and through `caCoordsToPdb`, which emits no SEQRES and
survives only because it numbers from 1. Source of truth:
`mol-model-formats/structure/basic/sequence` in Mol\*.
`docs/residue-numbering.md` is the user-facing map.

## `sequence.code`, not `sequence.label`

`label` spells a residue with no one-letter code by its component id (MSE, TPO,
ACE) and an alternate site as `(S|P)`, so the string outgrows `seqId`. Reading
it shifted 12 of 122 entities in a 72-entry sample (1H26's phospho-CDK2, 4ZZJ's
peptide as `RHKALYLNLEF` for 7 residues, 1GZM's chain by two from its N-terminal
ACE); residues disagreeing with SIFTS went from 113 to 1,145. The fixtures are
RCSB's one-letter sequences and the stubs handed `label` single letters, so no
test saw it. `extractEntities` reads `code`, takes parent letters from
`entity_poly.pdbx_seq_one_letter_code_can`, and matches RCSB's FASTA on all 122.

## `alignment`, not `pairwiseAlignment`

For an RCSB entry the model's `alignment` getter unmaps residues SIFTS gives
another protein (`fusionPartnerPositions`), so the two differ in length for a
fusion. On 2RH1 (β2-adrenergic receptor fused to T4 lysozyme) the local
alignment scattered 33 ICL3 residues onto lysozyme; 351 such residues across 70
entries went to 0 with no correct residue lost. Which protein is the
transcript's is decided by identity over the residues each covers, not by how
many it covers: a count unmapped an 11-residue p53 peptide fused to CDK2 and
kept 224 chance pairs. `docs/genome-to-structure-alignment.md` has the rest.

## One load is one Mol\* structure per model

The `all-models` preset turns an NMR ensemble into one Mol\* structure per
model, so a structure of the view holds `molstarStructures`, all of them. Color,
highlight and selection address every one; superposition TM-aligns the first and
moves the rest with it; removal goes by the trajectory. Keeping only the first
colored 1 of 1D3Z's ten models.

The e2e leg `colors every model of an NMR ensemble` failed once in about 35 runs
with 1 of 10 recolored, and never under CPU throttling or delayed replies. A
hierarchy snapshot taken after the first model was built would give exactly
that, and color no longer reads the snapshot, but the failure was never
reproduced to prove it. A repeat means the cause was something else.

## Everything on one plugin hears everything

Every structure of a view subscribes to the same plugin's interactions, and
AlphaFold models are all entity 1, so hovering mouse residue 100 lit human
residue 100 and its codon. `interactionPosition` checks the Mol\* model id
against every model the load created (an NMR ensemble has twenty). Mol\*'s
select and highlight channels are plugin-wide too; set per structure, the clear
before each one wiped the others' selection.

Mol\* model ids survive superposition: `TransformStructureConformation` builds
units with `applyOperator`, which keeps `unit.model`, and symmetry assemblies do
the same. No unit test reaches this.

## The ready marker

`protein-view-ready` and JBrowse's `showLoading` read one per-structure
`loading` getter: loaded into Mol\*, aligned, and SIFTS answered for a PDB
entry. Reading only the alignment, which is not pending before a structure has a
sequence, flipped the marker 3–6 s before the structure loaded, and the e2e's
multi-structure leg passed only because of that.

## Superposition

Mol\*'s `tmAlign` flattens every chain it is given into one with no breaks, so a
partner, a second copy or DNA steered the fit: 7OW4's MHC heavy chain landed on
the NRAS model with the NRAS peptide 15 Å from its own residues, 1TUP put copy C
rather than A on the p53 model, and the logged RMSD (38 Å for a 0.9 Å fit) meant
nothing. `superposeStructures` aligns one copy of each load's mapped chain, the
first drawn (also the copy highlight labels sit on), waits for every alignment,
and re-runs when the chain picker changes.

Measured thresholds:

- **The TM-score gate is normalised by the shorter chain, not the pivot.** By
  the pivot, 1TUP's 196-residue core on the 393-residue p53 model scores 0.49
  for a 1.06 Å fit; by the shorter chain, 0.98.
- **TM-align stays the main method.** A fit on transcript-matched pairs
  everywhere was worse on full domains: NRAS's disordered tail (170–189) pulls a
  plain fit of the AF NRAS/SOS1 complex to 4.00 Å, where TM-align's core fit is
  3.14. Pairs are the fallback, for a chain under 30 traced residues or a
  TM-score under 0.5, and the header row and Mol\*'s log say so.
- **A pair fit is gated on identity over the pairs (50%), not on RMSD.** 9BTM
  re-mapped to SHOC2 paired 48 chance residues at 27% identity and put a
  leucine-rich repeat on a GTPase at 10.9 Å; it now stays unmoved. An RMSD
  cutoff would reject 7OW4's peptide, 8 of 8 identical at 4.62 Å because a
  peptide in an MHC groove is not in the model's conformation. 50% sits above
  the best ribosome decoy's 29%.
