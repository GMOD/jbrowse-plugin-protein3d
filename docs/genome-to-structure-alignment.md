# Genome to structure: why the plugin aligns on the fly

The plugin maps a codon on the genome to a residue in a 3D structure by
translating the transcript's CDS and aligning that translation to the
structure's own sequence in the browser, every time a view opens. This page
records where that approach comes from, what it gets right, what it cannot get
right, and how the plugin decides which chain and which isoform to align.
Numbers below were measured on 2026-09-11 with the plugin's own aligner unless
another date is given.

## The precedent

Computing the mapping by pairwise alignment is not an invention of this plugin.
It is how the reference resources themselves are made:

- **SIFTS** (Velankar et al., _Nucleic Acids Res_ 2013; Dana et al., 2019) is
  the PDBe/UniProt cross-reference every structure viewer uses for UniProt to
  PDB residue numbering. It is produced by pairwise-aligning each PDB SEQRES to
  its UniProt sequence, with a taxonomy check to pick the accession. The
  plugin's `pdbUniProtMapping.ts` reads its output for feature tracks.
- **G2S, Genome to Structure** (Wang et al., _Bioinformatics_ 2018, from the
  cBioPortal group) maps genomic positions to PDB residues by aligning the
  protein sequence to SEQRES on demand, BLAST-based, and serves the result as an
  API. It is the closest published analogue to what the plugin does.
- **Mol\*, PDBe-KB and UniProt's structure viewer** all draw the same
  residue-level correspondence from SIFTS rather than computing it, so they are
  limited to the UniProt canonical sequence and to entries SIFTS has processed.

The plugin's variant differs in one deliberate way: it aligns **the transcript's
own translation**, not UniProt canonical. That keeps isoform differences visible
as gaps instead of silently mapping an alternate exon onto canonical numbering,
and it works for any structure with a sequence, including AlphaFold models,
Foldseek hits, and files the user opens by hand, none of which SIFTS covers.

## What the pipeline does

1. **Translate.** `calculateProteinSequence.ts` stitches the CDS subfeatures and
   translates with the NCBI table the feature's `transl_table` names. GFF3
   `phase` on the first CDS sets the frame; a 5' partial codon becomes a leading
   `&`, so residue 0 of the translation is the same partial codon that
   `g2p_mapper` assigns protein position 0. Core's bigGenePred adapter derives
   `phase` from UCSC `exonFrames`, so hub tracks carry it too. Only the terminal
   stop is stripped: an interior stop occupies a codon position, and deleting it
   would shift every later residue off its codon.
2. **Read the structure's sequence.** `extractStructureSequences.ts` takes each
   polymer entity's full sequence from molstar, SEQRES included, with the
   `label_seq_id` of every position carried alongside. See
   [residue numbering](residue-numbering.md) for why positions and ids differ.
   The sequence has exactly one letter per position. Molstar's `label` column
   does not: it spells a modified residue by its component id, so 4ZZJ's
   7-residue peptide read `RHKALYLNLEF` and every later position was off. The
   plugin reads `code` instead, and takes a modified residue's parent letter
   (MSE is M) from the mmCIF canonical sequence. Alternate residues at one site
   collapse to one position.
3. **Choose the chain.** `chooseMappedEntity.ts` aligns the transcript to every
   distinct protein entity and keeps the one with the most identical residues
   over the shorter of the two sequences, plus a pseudocount of 5. Nucleic-acid
   entities are excluded by molstar's entity subtype, because A, C, G, T and U
   are amino-acid letters too and a DNA strand aligns as protein.
4. **Align.** `pairwiseAlignment.ts` is a Gotoh affine-gap dynamic program with
   BLOSUM62 and EMBOSS's protein defaults, gap open 10 and extend 0.5.
   Smith-Waterman is the default; Needleman-Wunsch is offered. Only mapped
   columns, those with a residue on both rows, become coordinate maps, so a
   residue in a gap never highlights. Mismatched columns are mapped, which is
   what keeps a point-mutant structure usable.
5. **Report.** The alignment panel header shows identity over the aligned
   columns and how many of the structure's residues they cover, and warns when
   fewer than 30% of the shorter sequence's residues are identical, or fewer
   than 80% for an alignment under 20 residues.

## Why the scores are what they are

**Identity over the shorter sequence, not a match count.** The commonest shape
of a p53 PDB entry is a short p53 peptide bound to a large partner. A raw match
count picks the partner: on 1H26, CDK2 accrues 58 scattered identities against
the 11-residue peptide's 11, and on 4ZZJ SIRT1 gets 63 against 6. The
Smith-Waterman score does not separate them either (56 vs 58). Dividing by
length does:

| entry | chain             | identical | over shorter |
| ----- | ----------------- | --------- | ------------ |
| 1H26  | p53 peptide, 11aa | 11        | 0.69         |
| 1H26  | CDK2              | 58        | 0.19         |
| 4ZZJ  | p53 peptide, 7aa  | 6         | 0.50         |
| 4ZZJ  | SIRT1             | 63        | 0.18         |
| 7K00  | best of 55 chains | 31        | 0.24         |

An earlier version divided by the entity's length alone. That penalised a fusion
construct on the correct chain: a 60-residue product fused to a 370-residue
carrier scored 0.14, and a random 10-residue decoy chain with 3 identities beat
it in 17 of 50 trials. Over the shorter sequence the fusion scores 0.92 and the
decoy 0.20. The pseudocount stops a two-residue fragment that happens to match,
a tRNA end in 7K00, from scoring 1.0.

**The low-similarity floor.** A local alignment always returns something.
Between two unrelated random proteins it mapped 27 columns at 300 × 300, 100 at
500 × 150 and 186 at 1000 × 400, and without a readout every one of those
columns was a live genome hover indistinguishable from a real mapping. Local
identity does not expose them: because Smith-Waterman picks the best-scoring
stretch, those chance alignments run at 30 to 37% identity over the columns they
chose, and p53 against a ribosomal protein gives 31 identities at a third
identity. Coverage does not either, since the 500 × 150 case covers two thirds
of the shorter chain. Identical residues over the shorter sequence does: 0.03,
0.20, 0.15 and 0.24 for the chance cases, against 0.9 or better for any
structure of the transcript's protein and about 0.6 for an ortholog. The warning
fires under 0.3 on that ratio. A short alignment has to be nearly perfect
instead: under 20 identical residues the floor rises to 0.8, which a real bound
peptide clears (1YCR's 15 p53 residues are all identical, 4ZZJ's 7 are one off)
and a 10-residue decoy with 3 identities does not; under 5 identical residues
nothing passes.

**Isoform ranking.** An isoform whose translation equals the structure's
sequence is chosen outright. Any SEQRES lacking Met1 or carrying a tag, which is
most experimental entries, never matches exactly, so among the rest the launch
dialog ranks by identical residues against the structure, then length. Ranking
by length alone chose the longest isoform every time, and a shorter isoform the
structure was actually made from lost to one whose extra exon then aligned as a
gap.

## What alignment cannot decide

These are the cases where sequence alone has no answer, and the reason the chain
picker and the manual-alignment import exist:

- **Tandem repeats and duplicated domains.** A structure of one repeat aligns to
  whichever copy in the transcript scores highest; identical copies resolve to
  the first. Zinc-finger arrays and other near-identical repeats can map a
  fragment onto the wrong exon with high identity.
- **Paralogs in one complex.** Two paralogous chains both align well to the
  transcript; the picker takes the higher identity, which may be a coin flip for
  a recent duplication.
- **Chimeras.** On 2RH1, the β2-adrenergic receptor fused to T4 lysozyme, the
  local alignment bridges the fusion boundary and scatters about thirty ICL3
  residues onto lysozyme.
- **Remote homologs.** A Foldseek hit or an ortholog's AlphaFold model maps
  equivalent positions, which is what the user asked for, but with the identity
  a homolog has. The header readout is the only indication.

SIFTS resolves the first three for RCSB entries, because the depositors declared
which UniProt range each segment is. The plugin reads SIFTS only after the chain
is chosen and only for feature tracks; using its segments as the primary mapping
for PDB entries, with alignment as the fallback for everything else, is the
natural next step.

## Known limitations of the aligner itself

- The Needleman-Wunsch option charges end gaps, unlike EMBOSS needle's default,
  so a fragment against a full-length transcript pays for the unaligned termini.
  It still lands contiguously in tests, but semi-global scoring would make it
  the natural choice for fragments.
- The dynamic-programming table is capped at 40 million cells. A transcript the
  size of titin (34,350 aa) cannot be aligned to any chain over about 1,160
  residues; the view reports this instead of aligning.
- A modified residue in a PDB-format file reads as `X`, since the format has no
  canonical sequence to name its parent, so a selenomethionine scores as a
  mismatch against the transcript's M. It still aligns through.
- An ambiguous codon renders as `&`, scored as an unknown residue.
  Selenocysteine reaches the aligner as `*` on the transcript row and `U` on the
  structure row, a mismatch that aligns through.
