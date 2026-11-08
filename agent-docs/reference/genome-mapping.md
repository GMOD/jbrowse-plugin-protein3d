# Genome to structure, with the measurements

The user-facing account is `docs/genome-to-structure-alignment.md`; this page
holds what an agent changing the mapping needs beyond it.

## Data sources

The UniProt alignment of an entry (what SIFTS curates), its protein sequences
and the entries for an accession come from RCSB's GraphQL APIs (`data.rcsb.org`,
`sequence-coordinates.rcsb.org`) since p2s_mapper 2.0.0. RCSB's alignment agreed
with SIFTS on every residue of 23 entries, 2RH1 and the 7K00 ribosome included,
and answered in 3 s where PDBe took 24 s and 500'd on 6OIJ; 3D-Beacons listed no
structure for BRCA1 where both had 33, and PDBe's best_structures timed out on
HBB. The remaining EBI reads are AlphaFold DB (models, AlphaMissense csv),
UniProt, and the Antigen track, which has no other source.

The ClinVar track reads NCBI's VCF through the linked transcript
(`clinVarTrackSource.ts`): it needs the transcript, a genome on hg38 or hg19,
and the transcript's alignment to the entry, so it is built after the view opens
and rides inline in the track's config.

## Chain choice

`chooseMappedEntity` ranks chains by identity over the shorter of transcript and
chain; the measurements are in `docs/genome-to-structure-alignment.md`, and the
entries behind them (1H26, 4ZZJ, 2RH1, a ribosome) are test fixtures to keep.
Nucleic-acid chains are excluded by Mol\*'s entity subtype rather than left to
score low, because A, C, G, T and U are amino-acid letters too; they stay in the
**Mapped chain** picker, labelled in nt.

## The two sides of a hover name the chromosome differently

A genome hover arrives as `session.hovered.hoverPosition.refName`, the
assembly's canonical name (`1` on jbrowse.org's hg38). The transcript's `g2p`
map is keyed on the feature's, straight from the annotation file (`chr1` in
GENCODE). The gate is load-bearing: without it the same number on another
chromosome lights a residue for a different locus. A raw comparison made every
mismatched config, the e2e's own included, light nothing: 30 coding bases
hovered, zero responses, no throw. No unit fixture could see it, since every one
spells both refNames the same way; the e2e leg that found it hovers a real
session a pixel at a time and asserts `g2p` in and `p2gCodon` out.

`assemblyNaming` also gates `hoverPosition.assemblyName`: `session.hovered` is
one slot for every LGV in the session, synteny rows included, and hg19's `chr17`
at the same number is a different base.

The two names are not meant to be made equal: `hoverGenomeLocus` and
`hoverGenomeHighlights` emit the feature's `chr1`, both consumers resolve
aliases, and the e2e asserts coordinates rather than refName equality.

## An MSA reaches a structure through the genome

msaview and this plugin share one coordinate, the genome. A structure hover
reaches msaview as `hoverGenomeHighlights`; an MSA hover reaches a structure as
msaview's `connectedHoverHighlights`, the codon under the hovered column, mapped
genome → transcript → structure (`src/ProteinView/connectedHover.ts`). They pair
by sharing a `connectedViewId`. A bridge that matched the structure's sequence
to a row and otherwise used the column number as a residue index broke on every
Pfam seed and PDB fragment: in the protein browser's TP53 seed session, hovering
R248 painted a second codon 400 bp away.
