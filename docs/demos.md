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

## A gene by name

The whole spec of this link is `{"type":"ProteinView","gene":"BRAF"}`. The
plugin finds BRAF through the hub's text search index, opens the genome on it,
looks up its UniProt entry and that entry's AlphaFold model, and maps the
isoform the model was folded from. The link uses JBrowse `main`, and `gene`
needs plugin 1.2.0 or later.

[BRAF by name](https://jbrowse.org/code/jb2/main/?config=%2Fucsc%2Fhg38%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22gene%22%3A%22BRAF%22%7D%5D%7D)

<!-- expect {"chain":"A","minIdentity":0.99,"minAligned":700} -->

Any hub whose assembly has a text search index over its gene track takes the
same spec. The mouse link opens Trp53 on mm39, and the yeast link CDC28 on
sacCer3, each with its own species' AlphaFold model.

[Mouse Trp53 by name](https://jbrowse.org/code/jb2/main/?config=%2Fucsc%2Fmm39%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22gene%22%3A%22Trp53%22%7D%5D%7D)

<!-- expect {"chain":"A","minIdentity":0.99,"minAligned":390} -->

[Yeast CDC28 by name](https://jbrowse.org/code/jb2/main/?config=%2Fucsc%2FsacCer3%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22gene%22%3A%22CDC28%22%7D%5D%7D)

<!-- expect {"chain":"A","minIdentity":0.99,"minAligned":298} -->

## Bacteria, fungi and viruses by name

The same one-field spec works on the GenArk hubs, which cover every RefSeq
assembly UCSC hosts. Each link below names a gene and nothing else about it, and
needs plugin 1.2.1 or later.

Bacteria. A prokaryotic gene has no transcript record, so the plugin reads the
protein's accession off the CDS: NCBI writes E. coli K-12's UniProt entry there,
and for the others the RefSeq protein maps to one.

[E. coli recA](https://jbrowse.org/code/jb2/main/?config=%2Fhubs%2Fgenark%2FGCF%2F000%2F005%2F845%2FGCF_000005845.2%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22gene%22%3A%22recA%22%7D%5D%7D)

<!-- expect {"chain":"A","minIdentity":0.99,"minAligned":353} -->

[M. tuberculosis katG](https://jbrowse.org/code/jb2/main/?config=%2Fhubs%2Fgenark%2FGCF%2F000%2F195%2F955%2FGCF_000195955.2%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22gene%22%3A%22katG%22%7D%5D%7D)

<!-- expect {"chain":"A","minIdentity":0.99,"minAligned":740} -->

[B. subtilis ftsZ](https://jbrowse.org/code/jb2/main/?config=%2Fhubs%2Fgenark%2FGCF%2F000%2F009%2F045%2FGCF_000009045.1%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22gene%22%3A%22ftsZ%22%7D%5D%7D)

<!-- expect {"chain":"A","minIdentity":0.99,"minAligned":382} -->

Fungi. The fission yeast assembly names the species (taxon 4896) and Swiss-Prot
files its proteins under the reference strain (284812), so the gene-name search
widens to the taxon's descendants when the taxon itself has no entry.

[S. pombe cdc2](https://jbrowse.org/code/jb2/main/?config=%2Fhubs%2Fgenark%2FGCF%2F000%2F002%2F945%2FGCF_000002945.1%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22gene%22%3A%22cdc2%22%7D%5D%7D)

<!-- expect {"chain":"A","minIdentity":0.99,"minAligned":297} -->

[C. albicans ERG11](https://jbrowse.org/code/jb2/main/?config=%2Fhubs%2Fgenark%2FGCF%2F000%2F182%2F965%2FGCF_000182965.3%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22gene%22%3A%22ERG11%22%7D%5D%7D)

<!-- expect {"chain":"A","minIdentity":0.99,"minAligned":528} -->

[A. fumigatus cyp51A](https://jbrowse.org/code/jb2/main/?config=%2Fhubs%2Fgenark%2FGCF%2F000%2F002%2F655%2FGCF_000002655.1%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22gene%22%3A%22cyp51A%22%7D%5D%7D)

<!-- expect {"chain":"A","minIdentity":0.99,"minAligned":515} -->

Viruses. AlphaFold DB holds no viral proteins, so a viral link names a PDB entry
beside the gene. The spike link opens the trimer 6VXX beside the SARS-CoV-2
genome, the gag link the HIV-1 capsid hexamer 3H47 on the gag polyprotein, and
the cI link the lambda repressor bound to its operator.

[SARS-CoV-2 spike on 6VXX](https://jbrowse.org/code/jb2/main/?config=%2Fhubs%2Fgenark%2FGCF%2F009%2F858%2F895%2FGCF_009858895.2%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22gene%22%3A%22S%22%2C%22pdbId%22%3A%226VXX%22%7D%5D%7D)

<!-- expect {"minIdentity":0.98,"minAligned":1200} -->

[HIV-1 gag on 3H47](https://jbrowse.org/code/jb2/main/?config=%2Fhubs%2Fgenark%2FGCF%2F000%2F864%2F765%2FGCF_000864765.1%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22gene%22%3A%22gag%22%2C%22pdbId%22%3A%223H47%22%7D%5D%7D)

<!-- expect {"minIdentity":0.95,"minAligned":225} -->

[Phage lambda cI on 1LMB](https://jbrowse.org/code/jb2/main/?config=%2Fhubs%2Fgenark%2FGCF%2F000%2F840%2F245%2FGCF_000840245.1%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22gene%22%3A%22cI%22%2C%22pdbId%22%3A%221LMB%22%7D%5D%7D)

<!-- expect {"minIdentity":0.99,"minAligned":90} -->

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

## A predicted model and a crystal superposed

This link opens the AlphaFold model of human p53 beside 1TUP, the p53 core bound
to DNA. TM-align superposes the crystal on the model, and both map to the same
transcript. Each structure's row in the view header has an eye button: hide 1TUP
to see the model's full chain underneath it, then use **Re-align structures
(TM-align)** in the view menu; the superposition runs again and 1TUP stays
hidden until you show it. The link uses JBrowse `main`, and the eye button
arrives with the first plugin release after 1.0.0.

[TP53 on AlphaFold and 1TUP](https://jbrowse.org/code/jb2/main/?config=%2Fucsc%2Fhg38%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22structures%22%3A%5B%7B%22uniprotId%22%3A%22P04637%22%7D%2C%7B%22pdbId%22%3A%221TUP%22%7D%5D%2C%22transcriptId%22%3A%22NM_000546.6%22%2C%22connectedView%22%3A%7B%22assembly%22%3A%22hg38%22%2C%22loc%22%3A%22chr17%3A7%2C668%2C421-7%2C687%2C550%22%2C%22tracks%22%3A%5B%22hg38-ncbiRefSeqCurated%22%5D%7D%7D%5D%7D)

<!-- expect {"superposed":2,"structures":[{"chain":"A","minIdentity":0.99,"minAligned":390},{"chain":"A","minIdentity":0.95}]} -->

## A structure with no transcript

This link opens 1TUP alone, with no gene to map it to. Without a transcript the
plugin reads hovers from the first protein chain, p53's A/B/C, rather than from
the DNA strands E and F that come first in the file, and the chain picker on the
structure's row switches to any of the three entities. Hovers read only the
chosen chain: a residue on another chain used to read out as the chosen chain's
residue at the same index, so a DNA base named a p53 residue. The link uses
JBrowse `main`, and the picker and the hover gating arrive with the first plugin
release after 1.0.0.

[1TUP without a transcript](https://jbrowse.org/code/jb2/main/?config=%2Fucsc%2Fhg38%2Fconfig.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22pdbId%22%3A%221TUP%22%7D%5D%7D)

<!-- expect {"chain":"A"} -->
