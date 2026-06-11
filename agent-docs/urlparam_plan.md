# Protein3D — declarative launch / URL-param plan

Roadmap for the `LaunchView-ProteinView` session-spec surface. Read this before
touching `src/LaunchProteinViewExtensionPoint/` or the launch flow — it records
what's deliberately explicit, what was tried and rejected, and the one feature
worth building if there's demand.

## Context: what's already done

- **`connectedView` launch param**
  (`src/LaunchProteinViewExtensionPoint/index.ts`, committed on branch
  `connected-view-launch`). A session spec launches each view independently with
  an auto-generated id, so there was no declarative way to set
  `connectedViewId`. Passing `connectedView: { loc, assembly, tracks }` now
  makes the launcher create the LinearGenomeView itself and wire the id, so a
  **single spec entry** yields a linked genome+protein pair. This mirrors what
  the interactive "launch from gene" flow does, just declaratively. ~10 lines,
  no magic. Verified.
- **Docs** (`DEVELOPERS.md`): params table, the `feature` shape (transcript with
  `CDS` subfeatures, absolute 0-based coords + `phase`), standalone + connected
  examples. AlphaFold URLs are `model_v6` (`_v4` now 404s — keep an eye on this,
  it bumps).
- **Doc smoke-test** (`scripts/test-docs.mjs`, `pnpm test:docs`): loads the
  standalone + connected examples in headless Chrome and asserts they render
  (structure extracted, `connectedView` wiring, genome→protein mapping built,
  tracks rendered, no console errors). Auto-starts `pnpm start` if :9000 is
  down.

## Deliberately NOT done (and why)

- **Auto-deriving `userProvidedTranscriptSequence` from `feature` + the
  connected assembly.** Tried it (reuse `fetchProteinSeq` →
  `getProteinSequence`). It _worked_ — the sequence translates from the
  reference with nothing in the URL. Reverted anyway, because as written it
  added: a dual-mode `fetchProteinSeq` (view **or** session+assemblyName), an
  async RPC inside the launch handler, and a silent `try/catch` that degrades to
  an **unlinked** structure on failure with only a `console.error`. Trading one
  URL blob for a silent-failure path in the core launcher is a bad deal. **Do
  not reintroduce this as a silent best-effort step.** If derivation is added,
  failures must surface (notification), not be swallowed.

## The design stance (don't relitigate without a reason)

The explicit `feature` + `userProvidedTranscriptSequence` is **honest, not
hacky**. The genome↔protein mapping genuinely needs the transcript CDS, and the
alignment genuinely needs the protein sequence. There is no clean way to avoid
providing them without reproducing the interactive **resolution UX** (UniProt
lookup → transcript picker → sequence-mismatch handling — see
`src/LaunchProteinView/components/{AlphaFoldDBSearch,TranscriptSelector,SequenceMismatchNotice}`),
which exists precisely because that resolution is fuzzy and often needs a human.
For a declarative link, explicit + predictable beats short + magic. The people
who hit the verbosity are narrow: hand-crafted demo links (computed once) and
embedding apps (which use the programmatic API and already hold the data).

## The one feature worth building — only if there's real demand

A genuinely short URL:
`{ type: 'ProteinView', uniprotId: 'P04637', transcriptId: 'NM_000546.6', connectedView: { assembly, loc, tracks } }`
that derives the structure URL, the `feature`, and the sequence.

**This is a real feature, not a URL hack.** The right shape is to promote the
existing interactive resolver into a headless async entry point with real error
surfacing — NOT to bolt best-effort derivation onto the launch handler.

Sketch (each step already exists in the interactive flow; this composes them):

1. **structure URL from uniprotId** — `getUniprotIdFromAlphaFoldTarget` inverse;
   AlphaFold URL is
   `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v6.cif`. (See
   `src/LaunchProteinView/services/lookupMethods.ts` for the existing lookup.)
2. **`feature` from the connected track** — once `connectedView` is created,
   fetch features at `loc` from the named gene track and pick the transcript by
   `transcriptId`/name (reuse `selectBestTranscript.ts`). Needs the track
   adapter and the view to be initialized, which is async and order-dependent.
3. **sequence by translation** — `fetchProteinSeq` already does
   `waitForAssembly` → `CoreGetFeatures` on the sequence adapter →
   `getProteinSequence`. Refactor it to take
   `{ session, assemblyName, feature }` (keep the existing `{ view, feature }`
   caller in `hooks/useIsoformProteinSequences.ts` working).
4. **surface failures** — if any step fails (no structure for uniprotId,
   transcript not found, sequence/structure mismatch), call
   `session.notify(...)`. Do not leave a half-wired view with a console error.

**Gotchas (learned the hard way):**

- **Assembly/view readiness.** A view created via `addView({ init })` does not
  have `assemblyNames` populated immediately — the `init` autorun navigates
  async. So derive the sequence from `connectedView.assembly` directly (you know
  it), not from the created view's `assemblyNames[0]`.
- **Stop codon.** A provided UniProt sequence is 393 aa (no stop); a sequence
  translated from the CDS is **394** (includes the stop codon). The alignment
  autorun in `ProteinView/structureModel.ts` strips it (`stripStopCodon`), so
  the mapping still works — but any length assertion must account for the +1.
- **`g2p_mapper` input.** The mapping reads `strand` (must be ±1) and `CDS`
  subfeatures with `start < end` and `phase`, in absolute 0-based half-open
  coords. Exon (non-CDS) subfeatures are ignored. Validate a candidate `feature`
  by checking distinct protein positions == expected length (see how
  `scripts/test-docs.mjs` / the website `screenshot-specs.ts` TP53 entry were
  built).
- **Sequence/structure mismatch is normal.** AlphaFold = the UniProt sequence;
  the transcript translation can differ (isoforms, selenocysteine, etc.). The
  alignment is a _local_ alignment (`runLocalAlignment`) precisely to absorb
  this. A short URL that assumes exact identity will silently mis-map; keep the
  alignment step.

## Testing

- `pnpm test:docs` is the regression guard — extend it with a case per new
  param. It exercises the **real** declarative path (`spec-` URL →
  `loadSessionSpec` → `LaunchView-ProteinView`), not a unit mock.
- The harness needs the local plugin build (`pnpm start`, serves `dist/out.js` +
  `config.json` + `.test-jbrowse-nightly` on :9000).
- **If genome tracks render as a red "reading 'find'" error bar, the
  `.test-jbrowse-nightly` app is stale** — recreate it
  (`rm -rf .test-jbrowse-nightly && npx @jbrowse/cli create .test-jbrowse-nightly --nightly`).
  This is an environment problem, not a connectedView bug (it reproduces with a
  plain LGV and no ProteinView).

## Downstream

The JBrowse website tutorial (`website/docs/tutorials/protein_structure.md` in
`jbrowse-components`) uses `connectedView` for its connected screenshot and a
curated `screenshot-specs.ts` entry. A **one-click connected live link** can be
added there once a plugin version with `connectedView` is published and reaches
the public hg38 instance
(`jbrowse.org/code/jb2/latest/?config=/ucsc/hg38/config.json`). Until then that
tutorial links the standalone structure (works on the published plugin) and
shows the connected view as a screenshot.
