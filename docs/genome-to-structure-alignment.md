# Genome to structure: why the plugin aligns on the fly

The plugin maps a codon on the genome to a residue in a 3D structure by
translating the transcript's CDS and aligning that translation to the
structure's own sequence in the browser, every time a view opens. This page
records where that approach comes from, what it gets right, what it cannot get
right, and how the plugin decides which chain and which isoform to align.
Numbers below were measured on 2026-09-11 with the plugin's own aligner unless
another date is given. The modules named below — `extractStructureSequences.ts`,
`chooseMappedEntity.ts`, `pairwiseAlignment.ts`, `alignmentQuality.ts`,
`pdbUniProtMapping.ts`, `isoformRanking.ts` — are the `p2s_mapper` package's,
not this repo's.

## The precedent

Computing the mapping by pairwise alignment is not an invention of this plugin.
It is how the reference resources themselves are made:

- **SIFTS** (Velankar et al., _Nucleic Acids Res_ 2013; Dana et al., 2019) is
  the PDBe/UniProt cross-reference every structure viewer uses for UniProt to
  PDB residue numbering. It is produced by pairwise-aligning each PDB SEQRES to
  its UniProt sequence, with a taxonomy check to pick the accession. The
  plugin's `pdbUniProtMapping.ts` reads its output for feature tracks and to
  keep a fusion partner out of the mapping.
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
   translates with the NCBI table the feature's `transl_table` names, else the
   one the assembly's `geneticCodes` names for the contig (`{ chrM: 2 }` in the
   hub configs; v5 hosts only), else the standard code. GFF3 `phase` on the
   first CDS sets the frame; a 5' partial codon becomes a leading `&`, so
   residue 0 of the translation is the same partial codon that `g2p_mapper`
   assigns protein position 0. Core's bigGenePred adapter derives `phase` from
   UCSC `exonFrames`, so hub tracks carry it too. Only the terminal stop is
   stripped: an interior stop occupies a codon position, and deleting it would
   shift every later residue off its codon.
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
dialog ranks by alignment score against the structure, then identical residues,
then length. Ranking by length alone chose the longest isoform every time.
Ranking by identical residues still chose a longer isoform whenever the
structure lacked one of its exons, because that isoform aligns every structure
residue too, across a gap: on 1MH1, Rac1b and its 19-residue insert tie Rac1 at
182 identical and won on length. The gap penalty is what separates them.
Measured 2026-09-12 against SIFTS' isoform assignment for 55 structures,
identical residues then length agreed 43 times and the score 47, with no case
lost. The remaining 8 are exact score ties between isoforms that differ only
outside the structure, where SIFTS names the canonical isoform and length picks
the longest.

The dialog has to rank against the right chain first. It compares with a chain
some isoform translates to exactly, else the chain `chooseMappedEntity` picks
for the longest isoform. Falling back to the first chain ranked p53's isoforms
against CDK2 on 1H26, where p53β, which ends before the bound peptide, won on
chance identities to the kinase.

## Checked against SIFTS

Measured 2026-09-12 on 70 RCSB entries: 112 pairings of an entry with a UniProt
accession SIFTS maps into it, 63 of them with more than one protein chain to
choose from. The UniProt sequence stood in for the transcript's translation, the
entity sequences were the ones the plugin extracts, and the truth was SIFTS'
residue-level mapping.

- **Chain choice:** 112 of 112 agree.
- **Residues:** 28,130 map to the position SIFTS gives and 113 do not. 76 of the
  113 are 1UBQ on polyubiquitin, whose nine copies are identical, so SIFTS'
  choice of copy and the plugin's are equally right. 34 are 5G53, where SIFTS
  itself is wrong: it maps the structure's `KQLQKDKQVYRA` to Gαs 151 rather than
  28, where that sequence is.
- **Onto the wrong protein:** 351 residues mapped onto residues SIFTS assigns to
  a fused partner, all in engineered constructs: β2AR, D3R, A2A, μOR and NTSR1
  receptors fused to T4 lysozyme or BRIL, and a Gα chimera in 6OIJ. The plugin
  now unmaps them (see chimeras below): 0 remain, with the 26,463 agreeing
  residues and the 5 missed ones unchanged.
- **Unmapped:** 302 residues SIFTS maps sit on a second chain of the same
  product (insulin's A chain in 4INS, nsp7 and nsp8 in 7BV2), which the plugin
  does not map, since it maps one chain per transcript.

Chain choice and residue agreement are an easy test: SIFTS is itself
alignment-derived, and UniProt canonical is close to every SEQRES here. The
translation step it skips is checked separately below.

## Checked against GENCODE's translations

The SIFTS check starts from a protein sequence, so it says nothing about the
step before: turning a GFF3 transcript into a protein and each residue back into
genome bases. Measured 2026-09-12 on 6,015 GENCODE v44 protein-coding
transcripts (every one on chr21, chr22, chrY and chrM, the selenoproteins, and
3% of genes elsewhere). Features came from JBrowse's own `Gff3Feature` over
gff-nostream, bases from the hosted hg38 FASTA, and the plugin translated them
exactly as a launch does. The reference was GENCODE's published
`pc_translations.fa`.

- **Translation:** 5,998 match. Of those, 4,871 match letter for letter. The
  rest differ only in notation: a partial codon at either end written `&` where
  GENCODE writes `X` or nothing, selenocysteine as `*` where GENCODE writes `U`,
  and a non-ATG start (CTG read as L where GENCODE writes M).
- **Codon to genome:** for all 2,589,369 complete codons, the bases `g2p_mapper`
  assigns to a residue translate to that residue, and each of those bases maps
  back to it.
- **Real differences, 17:** all 13 mitochondrial proteins, because GENCODE's
  chrM CDS lines carry no `transl_table` and the plugin translated them with the
  standard code, so TGA read as a stop and ATA as I. Using the assembly's code
  fixes 12; MT-ND2 still starts with I, the non-ATG start again. Three are
  stop-codon readthrough (MPZ, AQP4, VEGFA), where GENCODE writes `X` at the
  read-through stop. GPX4-207 ends on a selenocysteine, which the plugin strips
  as a terminal stop.

Every remaining difference is one substituted residue or one at an end of the
protein, so none moves a later position.

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
  local alignment bridges the fusion boundary and scatters 33 ICL3 residues onto
  lysozyme. Every GPCR fusion construct in the SIFTS check does the same, up to
  85 residues on 3PBL. Sequence cannot fix it: BLAST's 11/1 gap costs do not
  help (361 residues against 351), and unmapping 10-column windows under 50%
  identity removes only 186 of the 351 while losing 9 correct residues. For an
  RCSB entry the plugin asks SIFTS which protein each residue belongs to, takes
  the transcript's own protein to be the one whose residues the alignment pairs
  identically most often (plus a pseudocount of 5, as the chain picker scores
  chains), and unmaps any aligned residue SIFTS assigns to another protein
  (`fusionPartnerPositions`). Counting covered residues instead chose the wrong
  protein for a short product on a long carrier: TP53's 11-residue peptide fused
  to CDK2 covers 11 residues against 224 chance pairs on the kinase. Nothing is
  unmapped unless the chosen protein reaches half identity. SIFTS segments are
  matched by chain, because a PDB-format file numbers its entities differently.
  On the 70 entries the 351 residues went to 0 with no correct residue lost. A
  chimera of related proteins, such as 5AFH's α7/AChBP, keeps only the
  transcript's own part mapped, although the AChBP part sits at equivalent
  positions. An imported alignment, from the manual import or a spec, is used as
  given, which is the way to map such a part. Without SIFTS (AlphaFold,
  Foldseek, a user's file, PDBe unreachable after two retries) the alignment is
  used as is.
- **Products split across chains.** Insulin's A and B chains, or a viral
  polyprotein's cleavage products, each align to a separate stretch of one
  transcript. The picker maps the best of them and leaves the rest unmapped.
- **Remote homologs.** A Foldseek hit or an ortholog's AlphaFold model maps
  equivalent positions, which is what the user asked for, but with the identity
  a homolog has. The header readout is the only indication.

SIFTS could resolve the first four for RCSB entries, because the depositors
declared which UniProt range each segment is. The plugin uses it for chimeras
and feature tracks only. Repeats and paralogs would need SIFTS' segments to
choose the chain and the copy, which only helps when the transcript's UniProt
accession is known and its sequence matches the transcript's.

## Known limitations of the aligner itself

- Gap costs of 10 and 0.5 are more lenient than any BLOSUM62 setting BLAST
  supports, and past the point where chance local alignments stay short. Between
  random sequences at background composition, Smith-Waterman maps about 60
  columns at 200 × 200 and 1,900 at 3,200 × 3,200, against 27 and 62 at BLAST's
  11/1 (2026-09-12). That is where the 58 chance identities with CDK2 above come
  from; at 11/1 CDK2 gets 9. On structures of the transcript's own protein the
  two settings map the same residues, and 10 of 14 real homolog pairs map
  identically, so the difference is confined to divergent regions and chance
  hits. Changing it means recalibrating the floors above, and the stepped floors
  there are not monotone: 19 identical residues over 25 warn while 20 over 66 do
  not.

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
