Todo items 1 and 4 are done, merged into main and pushed. CI passed every job on
main: build, lint and unit tests, host compat, and both e2e legs (nightly and
v4.3.0). Nothing is published; pnpm version patch is still yours to run when you
want a release.

Alignment off the main thread (item 1). The alignment costs about 50 ns per
cell, so a long protein or a large complex used to freeze the tab for seconds.

- Now in the RPC worker: choosing the chain when a structure loads, the manual
  chain pick, and the launch dialog's isoform ranking.
- Still immediate: a chain identical to the transcript maps without the worker,
  which covers the usual AlphaFold case. The isoform you right-clicked can
  launch while the others are still being ranked.
- Fallback: if a host's worker can't run the method, the alignment runs on the
  main thread with a console warning, and CI fails on that warning.
- host-compat now opens 1YCR alongside the AlphaFold model. 1YCR is the
  structure whose alignment has to go through the worker, so every hosted
  release, v4.0.0 included, now checks the worker path.
- Three review rounds found real race bugs, all fixed with tests that fail when
  the fix is reverted. The worst: a late answer from the worker could overwrite
  an alignment the user had imported by hand, and cancelling a chain pick could
  leave the structure with no alignment at all.

Dialog screenshot (item 4). The e2e now waits until the UniProt table has
painted before capturing 05-dialog-ready, and the new v4.3.0 reference image
shows the full table.

Other things I did along the way:

- I rebased twice because main moved (the linked-hover and colour-scale work),
  then reran the gates on the combined code.
- Main already had one file, kyteDoolittleColorTheme.ts, that failed CI's
  Prettier check. I committed a formatting-only fix before pushing so CI
  wouldn't go red.
- The push also carried 6 commits other sessions had landed on main without
  pushing.
- protein3d's and msaview's e2e suites both defaulted to port 9876 and were
  killing each other's test server. The msaview session now reads JBROWSE_PORT,
  and I used 9931.
- I corrected a wrong memory note: host-compat does serve the candidate bundle
  to the RPC worker.

Still open on the todo:

- Colouring the 3D structure by AlphaMissense score.
- Splitting structureModel.ts, now 1,650 lines; the alignment bookkeeping is the
  natural piece to move out.
- Superseded alignments still run to completion in the worker; only their
  answers are dropped.
- Two unused p2s_mapper functions to drop at its next major version.

---

Still to do from the original plan:

- Grouping feature tracks by category, so there are fewer rows.
- Counting natural variants per residue instead of drawing 1,363 separate bars
  for p53.
- Averaging hydrophobicity over a window of residues.
- A single way to hide feature tracks.
- Keeping features that run past the end of a structure's construct, drawn cut
  at its edge, instead of dropping them.
- A zoom that fits the whole protein to the view's width.
