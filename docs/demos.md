# Demos: the structures that are easy to map wrong

Each link opens JBrowse on hg38 with a gene and a structure side by side, linked
residue to codon. Hover the gene to light the residue, or a residue to light the
codon. Every case below was mapped or shown wrongly by some earlier version of
the plugin; [genome to structure alignment](genome-to-structure-alignment.md)
records how the mapping cases were measured.

The links load the plugin published at `jbrowse.org/plugins/…/latest`, so a fix
shows here once it is released. After `pnpm build`, `pnpm check-demos` opens
every link in this file with the local build and checks the expectation under
it; run it after changing a link or the mapping. Run without `--bundle`
(`node scripts/check-demos.mjs`), it checks the published plugin instead.

## A short peptide bound to a larger partner

1H26 holds an 11-residue p53 peptide bound to CDK2 and cyclin A. The kinase
aligns to p53 with more identical residues than the peptide has in total, so a
match count picks it. The plugin maps TP53 to the peptide, chain E.

[TP53 on 1H26](https://jbrowse.org/code/jb2/latest/?config=%2Fucsc%2Fhg38%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22pdbId%22%3A%221H26%22%2C%22transcriptId%22%3A%22NM_000546.6%22%2C%22connectedView%22%3A%7B%22assembly%22%3A%22hg38%22%2C%22loc%22%3A%22chr17%3A7%2C668%2C421-7%2C687%2C550%22%2C%22tracks%22%3A%5B%22hg38-ncbiRefSeqCurated%22%5D%7D%7D%5D%7D)

<!-- expect {"chain":"E","minIdentity":0.9,"minAligned":11} -->

## A protein bound to DNA

1TUP's first two chains are DNA strands, and A, C, G and T are amino-acid
letters too. The plugin skips nucleic-acid chains and maps TP53 to the
DNA-binding domain.

[TP53 on 1TUP](https://jbrowse.org/code/jb2/latest/?config=%2Fucsc%2Fhg38%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22pdbId%22%3A%221TUP%22%2C%22transcriptId%22%3A%22NM_000546.6%22%2C%22connectedView%22%3A%7B%22assembly%22%3A%22hg38%22%2C%22loc%22%3A%22chr17%3A7%2C668%2C421-7%2C687%2C550%22%2C%22tracks%22%3A%5B%22hg38-ncbiRefSeqCurated%22%5D%7D%7D%5D%7D)

<!-- expect {"chain":"A","minIdentity":0.95} -->

## A receptor with another protein fused into it

2RH1 is the β2-adrenergic receptor with T4 lysozyme spliced into its third
intracellular loop. The alignment bridges the insert and used to pair 33 loop
codons with lysozyme residues. SIFTS assigns those residues to lysozyme, so the
plugin leaves them unmapped: the alignment shows the loop against gaps and then
the lysozyme against gaps, hovering the loop's codons lights nothing, and all
332 receptor residues SIFTS names stay mapped.

[ADRB2 on 2RH1](https://jbrowse.org/code/jb2/latest/?config=%2Fucsc%2Fhg38%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22pdbId%22%3A%222RH1%22%2C%22transcriptId%22%3A%22NM_000024.6%22%2C%22connectedView%22%3A%7B%22assembly%22%3A%22hg38%22%2C%22loc%22%3A%22chr5%3A148%2C825%2C000-148%2C829%2C000%22%2C%22tracks%22%3A%5B%22hg38-ncbiRefSeqCurated%22%5D%7D%7D%5D%7D)

<!-- expect {"chain":"A","unmapped":[237,398],"minIdentity":0.9,"minAligned":332} -->

## A phosphorylated residue

1H26's CDK2 carries phosphothreonine 160. Mol\* names that residue TPO rather
than giving it a letter, and the plugin used to read the name as three letters,
which pushed every later residue two places along: residue 200 mapped to
codon 198. Hover codon 200 now, and residue 200 lights.

[CDK2 on 1H26](https://jbrowse.org/code/jb2/latest/?config=%2Fucsc%2Fhg38%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22pdbId%22%3A%221H26%22%2C%22transcriptId%22%3A%22NM_001798.5%22%2C%22connectedView%22%3A%7B%22assembly%22%3A%22hg38%22%2C%22loc%22%3A%22chr12%3A55%2C966%2C000-55%2C973%2C000%22%2C%22tracks%22%3A%5B%22hg38-ncbiRefSeqCurated%22%5D%7D%7D%5D%7D)

<!-- expect {"chain":"A","residue":{"auth":200,"transcriptPos":199},"minIdentity":0.95} -->

## A mitochondrial protein

COX1 (MT-CO1) is encoded on chrM, whose genetic code reads TGA as tryptophan.
The hub's RefSeq track names no genetic code on the CDS, so the plugin takes the
hub assembly's `{ chrM: 2 }`, and cytochrome c oxidase subunit 1 in 5Z62 aligns
without interior stops. This link uses JBrowse `main`, the first host that
exposes an assembly's genetic codes.

[COX1 on 5Z62](https://jbrowse.org/code/jb2/main/?config=%2Fucsc%2Fhg38%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22pdbId%22%3A%225Z62%22%2C%22transcriptId%22%3A%22YP_003024028.1%22%2C%22connectedView%22%3A%7B%22assembly%22%3A%22hg38%22%2C%22loc%22%3A%22chrM%3A5%2C800-7%2C500%22%2C%22tracks%22%3A%5B%22hg38-ncbiRefSeqCurated%22%5D%7D%7D%5D%7D)

<!-- expect {"chain":"A","noInteriorStop":true,"minIdentity":0.95} -->

## Two species superposed

This link opens the AlphaFold models of human p53 and mouse p53 (P02340) in one
view. TM-align superposes the mouse model on the human one, and the plugin maps
both to the human transcript, the mouse at about 79% identity. Every AlphaFold
model is entity 1 of its file, so hovering mouse residue 100 used to light human
residue 100 and its codon as well. The plugin now tells the two apart by Mol\*
model id, and a hover on either lights only that model's own residue and codon.

[TP53 on human and mouse AlphaFold](https://jbrowse.org/code/jb2/latest/?config=%2Fucsc%2Fhg38%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22structures%22%3A%5B%7B%22uniprotId%22%3A%22P04637%22%7D%2C%7B%22uniprotId%22%3A%22P02340%22%7D%5D%2C%22transcriptId%22%3A%22NM_000546.6%22%2C%22connectedView%22%3A%7B%22assembly%22%3A%22hg38%22%2C%22loc%22%3A%22chr17%3A7%2C668%2C421-7%2C687%2C550%22%2C%22tracks%22%3A%5B%22hg38-ncbiRefSeqCurated%22%5D%7D%7D%5D%7D)

<!-- expect {"superposed":2,"structures":[{"chain":"A","minIdentity":0.99,"minAligned":390},{"chain":"A","minIdentity":0.75,"minAligned":380}]} -->

## A residue named the way a paper names it

The p53 hotspot every cancer paper calls R248 is author residue 248 in 1TUP,
whose chain starts at UniProt residue 94, so it is the chain's 155th residue.
This link's spec asks for `initialResidues: { start: 248, end: 248 }`, and the
view opens with R248 selected in Mol\* and its codon marked on the genome.
[Residue numbering](residue-numbering.md) follows that number from the paper to
the codon.

[TP53 R248 on 1TUP](https://jbrowse.org/code/jb2/latest/?config=%2Fucsc%2Fhg38%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22pdbId%22%3A%221TUP%22%2C%22initialResidues%22%3A%7B%22start%22%3A248%2C%22end%22%3A248%7D%2C%22transcriptId%22%3A%22NM_000546.6%22%2C%22connectedView%22%3A%7B%22assembly%22%3A%22hg38%22%2C%22loc%22%3A%22chr17%3A7%2C668%2C421-7%2C687%2C550%22%2C%22tracks%22%3A%5B%22hg38-ncbiRefSeqCurated%22%5D%7D%7D%5D%7D)

<!-- expect {"chain":"A","selected":{"auth":248,"transcriptPos":247}} -->

## An NMR ensemble

2L14 is a solution NMR structure of p53's transactivation domain (residues
13–61) bound to the coactivator-binding domain of mouse CBP, deposited as twenty
models. The plugin loads each model as its own Mol\* structure, and colour,
hover and selection reach all twenty; until 2026-09-18 a colour scheme reached
only the first. CBP is entity 1, and the plugin maps TP53 to the p53 chain, B.
Twenty models take noticeably longer to load than one crystal structure.

[TP53 on 2L14](https://jbrowse.org/code/jb2/latest/?config=%2Fucsc%2Fhg38%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22pdbId%22%3A%222L14%22%2C%22transcriptId%22%3A%22NM_000546.6%22%2C%22connectedView%22%3A%7B%22assembly%22%3A%22hg38%22%2C%22loc%22%3A%22chr17%3A7%2C668%2C421-7%2C687%2C550%22%2C%22tracks%22%3A%5B%22hg38-ncbiRefSeqCurated%22%5D%7D%7D%5D%7D)

<!-- expect {"chain":"B","models":20,"minIdentity":0.95,"minAligned":49} -->
