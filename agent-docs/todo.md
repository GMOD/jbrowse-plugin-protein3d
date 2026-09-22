- autoscrolling weird, hard to know best behavior

- first click on the cascadingmenubutton for autoscrolling goes off screen to
  right, second click loads menu correctly

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

- demos: `docs/demos.md` has no superposition (AF P04637 + mouse P02340), no
  author-numbered residue (`initialResidues` 248 on 1TUP) and no NMR ensemble
  (2L14, twenty models). jbrowse.org's `tp53_structures` tutorial already opens
  a superposition (AF P04637, 1TUP, 1YCR) and `initialResidues` 248 on 1TUP, so
  only the ensemble is missing everywhere; `harness/App.tsx` deep-links to
  `jbrowse.org/code/jb2/webgl-poc`, last built 2026-07-15, where a spec launch
  on `main` would open the session directly; the README example is an opaque
  share link rather than a spec a reader can see into.

- launch dialog: Foldseek reports a 400 or 414 raw for a protein over its length
  limit; the snapshot `uniprotId` shorthand (`resolveStructureUrl`) still
  guesses `AF-<acc>-F1-model_v6`, because hydration is synchronous.

- traced by review, not reproduced: a spec-supplied `pairwiseAlignment` is never
  validated and skips entity choice, so `mappedEntity` falls back to entity 1 (a
  DNA strand in 1TUP); `initialResidues` and `initialTranscriptResidues` both
  select min..max of the matched positions, so a range across 2RH1's receptor
  loop would take the T4 lysozyme between; a click in the Mol\* canvas cannot
  clear a declared selection, and a click on one structure leaves another's
  selection lit; the feature-track label column truncates to "Doma…", "Bind…" at
  45 px.

- page side (jb2hubs): once a release carries `initialTranscriptResidues`, the
  "opens on…" sessions should send the domain map's own numbering and drop
  `siftsNumbering.ts` and most of the "approximate" captions.
