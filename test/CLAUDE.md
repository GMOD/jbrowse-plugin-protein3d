# test

Why the gates are shaped this way: `agent-docs/reference/testing.md`.

- Right-click a feature with `openFeatureContextMenu`, which waits for the
  display's `featureIdUnderMouse`; a pixel offset misses the glyph row and reads
  as a broken menu.
- Assert a mapping is consistent with the transcript that arrived, not an exact
  count: hosts hand the menu different features.
- Before reading a red nightly leg as your diff, check
  `stat .test-jbrowse-nightly/index.html`: `pretest` refreshes the zip only once
  it is a week old, while CI downloads it fresh.
- Pipe a spawned process's output and print it on failure (as `setupJBrowse`
  does); a child writing to an inherited fd bypasses the console gate.
- Treat a repeat of `colors every model of an NMR ensemble` recoloring 1 of 10
  as a real race, not noise.
