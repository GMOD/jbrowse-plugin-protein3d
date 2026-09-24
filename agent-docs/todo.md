From the 2026-09-13 review against the jb2hubs protein browser, in the order
worth doing:

- jbrowse.org's `tp53_structures` tutorial opens a superposition and
  `initialResidues` 248 on 1TUP but no NMR ensemble; `docs/demos.md` now has
  2L14 (twenty models), which the tutorial could borrow.

- page side (jb2hubs): once a release carries `initialTranscriptResidues`, the
  "opens on…" sessions should send the domain map's own numbering and drop
  `siftsNumbering.ts` and most of the "approximate" captions. Every selection
  field now takes an array of ranges too, so an interface focus can send its
  contact stretches rather than 30–370.

Still open: moving both plugins onto core's translateTranscript needs a core
release first.
