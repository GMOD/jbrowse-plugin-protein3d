---
name: hover-partner-chain
description: A hover on a complex's partner chain lights nothing; name the partner and
  offer to go to its gene.
metadata:
  category: ready
  area: hover
  first_move: "Read the hovered unit's entity UniProt entry and name it in the hover
    readout when it is not the mapped entity."
  order: 4
---

A hover on the partner chain of a heterodimer lights nothing on the genome and
says nothing in the readout: only the mapped entity is linked to the
transcript. The partner is the point of opening a complex, so the view should
at least say what it is and where to find it.

The partner's identity is already loaded at no extra request:
`src/ProteinView/fileUniProt.ts` reads each chain's UniProt accession and gene
from an AlphaFold DB complex's own ModelCIF, and
`src/ProteinView/structureUniProt.ts` gives a PDB entry's per-entity accessions
through SIFTS.

- **The small step, about 100 lines:** a hover on a partner chain names it in
  the readout (`src/ProteinView/hoverReadout.ts`), e.g. "GSTM1 P09488 residue
  112", and a click offers "Go to GSTM1", navigating the connected genome view
  through `findGeneByName` (`src/LaunchProteinViewExtensionPoint/findGeneByName.ts`).
  No alignment, so no codon-level position.
- **The full step, several days:** map the partner to its own transcript (find
  the gene by name, translate its transcripts, keep the one matching the
  chain), align it off-thread like the mapped chain, keep a per-chain link next
  to today's single one, and route hovers and clicks on that chain through it.
  Most of the cost is the structure model's one-transcript assumption, shared by
  alignment, hover, highlight and the exon and ClinVar colorings. The partner
  usually sits on another chromosome, so the hover has to say where rather than
  light the visible genome view, or open a second one.

Homodimers need nothing: both copies are one entity and already map.
