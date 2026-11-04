---
name: spec-first-variant-and-track
description:
  Three spec-first additions from the 2026-11-04 review, each a launch or color
  key with at most one control: a variant to open on, a variant track that
  paints, and an exon color field.
---

The 2026-11-04 review weighed these against keeping the UI small. Each is a spec
key first, so a script or an agent gets it whole, and a person gets at most one
control.

- **A `variant` launch key.** `gene` plus `variant: "chr17:7674220 G>A"` opens
  the structure with the residue marked and labelled (`R248Q`). A labelled
  genome highlight already draws on the structure as spheres, rewritten to
  `Arg248` (`sessionHighlights.ts`), and `placeMissenseOnTranscript`
  (`clinVar.ts`) already names any SNV's substitution, so the launch only has to
  place the highlight; `resolveShortLaunch`'s `connectedView` takes no
  `highlight` today. A button in the variant's feature panel
  (`Core-extraFeaturePanel`, present on the beta.12 floor) could follow.
  AlphaMissense for the exact substitution is per row in the 1D track, not on
  the structure, which colors by the per-residue mean.
- **A variant track that paints.** The `track` color field reads only
  `f.get('score')` (`trackScoresSource.ts`), and a VCF feature has no `score`,
  so a cohort VCF (Dog10K, a TCGA cohort, gnomAD) silently paints nothing. A
  `count` stat, each feature scoring 1 in `scoreByBase`, plus a spec-only
  `scoreField` such as `INFO.AF`, generalize what ClinVar does on its own path.
  One entry in the existing stat menu.
- **An `exon` color field.** `values` with a threshold scale over alternating
  numbers already paints exons; a field built from the feature's subfeatures
  through `p2gCodon` saves writing them, and needs a rule for a codon an intron
  splits.
