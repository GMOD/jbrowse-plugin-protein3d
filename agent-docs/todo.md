- a declared selection is framed on load (`frameSelection.ts`, 2026-09-13), a
  clicked one still is not: `setClickedStructureRange` lights it and leaves the
  camera where it was. A `focusResidue(n)` that sets the selection and moves the
  camera to it would let an agent driving the view say "show me this one". From
  the jbrowse-components protein filmed take, 2026-09-02.

From the 2026-09-13 review against the jb2hubs protein browser, in the order
worth doing:

- several ranges at once. An interface focus lights 30–370 on TP53 because
  `clickedStructureRange` is one range. `selectLabelSeqIds` is already a list
  and msaview reads `clickGenomeHighlights` as one; what changes is
  `clickAlignmentRange` (`ProteinAlignment.tsx`, `SplitString.tsx`),
  `FeatureBar.tsx`, and one genome region per run. Needs a spec shape
  (`initialTranscriptResidues: [...]`) agreed with the page, which has no way to
  send several ranges yet.

- jbrowse.org's `tp53_structures` tutorial opens a superposition and
  `initialResidues` 248 on 1TUP but no NMR ensemble; `docs/demos.md` now has
  2L14 (twenty models), which the tutorial could borrow.

- traced by review, not reproduced: `initialResidues` and
  `initialTranscriptResidues` both select min..max of the matched positions, so
  a range across 2RH1's receptor loop would take the T4 lysozyme between; a
  click in the Mol\* canvas cannot clear a declared selection, and a click on
  one structure leaves another's selection lit.

- page side (jb2hubs): once a release carries `initialTranscriptResidues`, the
  "opens on…" sessions should send the domain map's own numbering and drop
  `siftsNumbering.ts` and most of the "approximate" captions.

Still open: moving both plugins onto core's translateTranscript needs a core
release first.
