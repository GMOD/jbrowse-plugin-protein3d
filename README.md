# jbrowse-plugin-protein3d

A 3-D protein structure viewer for JBrowse 2, linked residue by residue to the
genome. The plugin aligns each structure to the transcript's translation, so
hovering a residue highlights its codon and hovering a codon highlights its
residue.

## Gallery

Click a picture to open it live. CI re-renders the figures from `main` every
hour ([scripts/readme-figure.mjs](scripts/readme-figure.mjs)).

<table>
<tr><td width="50%"><a href="https://jbrowse.org/code/jb2/main/?config=%2Fucsc%2Fhg38%2Fconfig.json&amp;session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22structures%22%3A%5B%7B%22pdbId%22%3A%221TUP%22%2C%22initialResidues%22%3A%7B%22start%22%3A248%2C%22end%22%3A248%7D%7D%5D%2C%22transcriptId%22%3A%22NM_000546.6%22%2C%22sideBySide%22%3Atrue%2C%22color%22%3A%7B%22field%22%3A%22mappedChain%22%7D%2C%22connectedView%22%3A%7B%22assembly%22%3A%22hg38%22%2C%22loc%22%3A%22chr17%3A7%2C673%2C700-7%2C674%2C700%22%2C%22tracks%22%3A%5B%22hg38-ncbiRefSeqCurated%22%2C%22hg38-clinvarMain%22%5D%7D%7D%5D%7D"><img src="https://raw.githubusercontent.com/GMOD/jbrowse-plugin-protein3d/readme-figure/tp53-1tup.png" alt="TP53 beside PDB 1TUP, p53 core domain bound to DNA, with the R248 hotspot selected on the structure and its codon marked on the gene" width="100%"></a><br>R248 on the structure, its codon on the gene</td><td width="50%"><a href="https://jbrowse.org/code/jb2/main/?config=%2Fucsc%2Fhg38%2Fconfig.json&amp;session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22structures%22%3A%5B%7B%22uniprotId%22%3A%22P04637%22%7D%2C%7B%22pdbId%22%3A%221TUP%22%7D%5D%2C%22transcriptId%22%3A%22NM_000546.6%22%2C%22sideBySide%22%3Atrue%2C%22connectedView%22%3A%7B%22assembly%22%3A%22hg38%22%2C%22loc%22%3A%22chr17%3A7%2C673%2C700-7%2C674%2C700%22%2C%22tracks%22%3A%5B%22hg38-ncbiRefSeqCurated%22%2C%22hg38-clinvarMain%22%5D%7D%7D%5D%7D"><img src="https://raw.githubusercontent.com/GMOD/jbrowse-plugin-protein3d/readme-figure/superposed.png" alt="AlphaFold model of p53 and crystal structure 1TUP superposed beside TP53" width="100%"></a><br>An AlphaFold model and a crystal structure, superposed</td></tr>
<tr><td width="50%"><a href="https://jbrowse.org/code/jb2/main/?config=%2Fucsc%2Fhg38%2Fconfig.json&amp;session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinView%22%2C%22structures%22%3A%5B%7B%22pdbId%22%3A%221TUP%22%7D%5D%2C%22transcriptId%22%3A%22NM_000546.6%22%2C%22sideBySide%22%3Atrue%2C%22color%22%3A%7B%22field%22%3A%22track%22%2C%22trackId%22%3A%22hg38-clinvarMain%22%2C%22stat%22%3A%22count%22%2C%22title%22%3A%22ClinVar%20records%20per%20residue%22%7D%2C%22connectedView%22%3A%7B%22assembly%22%3A%22hg38%22%2C%22loc%22%3A%22chr17%3A7%2C673%2C700-7%2C674%2C700%22%2C%22tracks%22%3A%5B%22hg38-ncbiRefSeqCurated%22%2C%22hg38-clinvarMain%22%5D%7D%7D%5D%7D"><img src="https://raw.githubusercontent.com/GMOD/jbrowse-plugin-protein3d/readme-figure/clinvar.png" alt="1TUP colored by the number of ClinVar records on each residue's codon" width="100%"></a><br>Colored by ClinVar records per residue</td><td width="50%"><a href="https://jbrowse.org/code/jb2/main/?config=%2Fucsc%2Fhg38%2Fconfig.json&amp;session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22ProteinAnnotationView%22%2C%22uniprotId%22%3A%22P04637%22%2C%22transcriptId%22%3A%22NM_000546.6%22%2C%22connectedView%22%3A%7B%22assembly%22%3A%22hg38%22%2C%22loc%22%3A%22chr17%3A7%2C673%2C700-7%2C674%2C700%22%2C%22tracks%22%3A%5B%22hg38-ncbiRefSeqCurated%22%2C%22hg38-clinvarMain%22%5D%7D%7D%5D%7D"><img src="https://raw.githubusercontent.com/GMOD/jbrowse-plugin-protein3d/readme-figure/features.png" alt="UniProt features of P04637 laid along the TP53 gene in the 1D protein view" width="100%"></a><br>UniProt features aligned to the gene</td></tr>
</table>

## Use it

- Right-click a gene and choose **Launch › Protein view...**. The dialog looks
  the gene up in UniProt and lists every structure it finds: the AlphaFold
  model, the PDB entries RCSB maps to that entry with their partners and
  ligands, and AlphaFold DB's predicted complexes. Check several to open them
  superposed.
- It can also search Foldseek for related structures, or open your own file.
- Or try the
  [protein browser](https://staging.genomes.jbrowse.org/protein-browser/), which
  opens a gene by name. The plugin is installed by default on
  [genomes.jbrowse.org](https://genomes.jbrowse.org).

## Documentation

Using it:

- [TP53 tutorial][tp53]: AlphaFold model to crystal structure
- [Genomes tutorial][genomes]: proteins on genomes.jbrowse.org
- [Demos](docs/demos.md): live links, including tricky mappings
- [Your own structures](docs/your-own-structures.md): ColabFold, AF3, Boltz
  models
- [Launching](docs/launching.md): open a view from a URL or code
- [Session snapshots](docs/session-snapshots.md): restore a saved session
- [Reproducible figures](docs/figure-sessions.md): pin camera, marks, surface
- [Per-residue values](docs/per-residue-values.md): color by a track or your
  data

How it works:

- [Alignment](docs/genome-to-structure-alignment.md): how a codon maps to a
  residue
- [UniProt feature tracks](docs/uniprot-feature-tracks.md): UniProt domains as
  tracks
- [Secret sauce](docs/secret-sauce.md): how the views stay linked
- [Residue numbering](docs/residue-numbering.md): why a residue has four numbers

[tp53]: https://jbrowse.org/jb2/docs/tutorials/tp53_structures/
[genomes]: https://jbrowse.org/jb2/docs/tutorials/genomes_proteins/

## Citation

Diesh, C., Stevens, G., Bridge, C., Hogue, G., Buels, R., Cain, S., Stein, L., &
Holmes, I. (2026). Proteins in the Genome Browser: Integration of Phylogenies,
Alignments, and Structures With Nucleotide-level Evidence in JBrowse 2. Journal
of Molecular Biology, 169645. https://doi.org/10.1016/j.jmb.2026.169645. See
also https://github.com/GMOD/proteinbrowser.
