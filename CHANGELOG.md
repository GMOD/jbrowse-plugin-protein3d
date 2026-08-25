## [0.9.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.8.4...v0.9.0) (2026-08-25)

### Features

- **BREAKING** Drop the two AlphaFold a3m MSA launches (#36) ([7b70869](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/7b70869604a2cf796d0ef2c2aee0831866318807))

## [0.8.4](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.8.3...v0.8.4) (2026-08-17)

### Bug Fixes

- Stop intercepting every request, and assert the menu ([6436d90](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/6436d9072260c71b725b417d9d5b09e13160d166))

### Chores

- Ignore a node_modules symlink, not just the directory ([6c6b35b](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/6c6b35bf53fd84d1a2328499c768c87a93ef7bc1))
- Give the pinned-host setup a GitHub token ([561670f](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/561670fbceedfa38d05d504ea71b1cd9547a2c20))
- Generate the changelog with git-cliff, release from the tag ([51788b4](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/51788b418ea5ca1a575556a87d8bdef5f41393eb))

### Documentation

- Name both hosts the warning can mean ([54e2c48](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/54e2c48d24d552a0cb074d8321cecc029565a2c0))
- Add a CHANGELOG, backfilled across every tag ([2a2d3d6](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/2a2d3d6f5941fb03bccb50e0bde928631feaa41a))

## [0.8.3](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.8.2...v0.8.3) (2026-08-17)

- Call the display's super contextMenuItems with a receiver, so Launch protein
  view appears on both host shapes
- One name per launch, and stable testids on the launch rows
- Sentence case for the rest of the UI labels
- Run the released-host e2e leg against v4.3.0 rather than v3.7.0
- Write down the molstar and host-version seams, and the gff-nostream CDS
  truncation that turned out to be a parser bug upstream

## [0.8.2](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.8.1...v0.8.2) (2026-08-06)

- Select the plugin's own UI by testid in the e2e suite, and refresh the nightly
  reference screenshots
- Apply prettier, and gate preversion on the format check
- Dependency upgrades

## [0.8.1](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.8.0...v0.8.1) (2026-08-06)

- Add UniProt feature tracks on PDB structures, via SIFTS
- Address PDB residues by their real label_seq_id, and detect the file format
- Serve both context-menu shapes, keeping the released one, and read whichever
  track lookup the host has
- Stop translating through the host's codon table, and gate the candidate build
  on real hosts
- Fix chain-correct confidence and isoform matching, the dark theme, and
  alignment paste
- Fix structure handle binding, bound the pairwise DP, and handle interior stop
  codons
- Say something when the host has workspaces but not the move, rather than
  silently not splitting
- Make the puppeteer suite able to fail, and enforce formatting in CI

## [0.8.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.7.0...v0.8.0) (2026-07-24)

- Scope the UniProt gene-name lookup to the assembly's organism
- Accept a uniprotId/pdbId structure shorthand, and extract pure URL builders

## [0.7.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.6.0...v0.7.0) (2026-07-24)

- Declarative view setup and reactive superposition
- Fix coordinate off-by-ones, stale-state bugs, and adapter duplication

## [0.6.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.8...v0.6.0) (2026-07-24)

- Content-hash the molstar chunk, so a stale cache can't serve the old one
- Centralize the highlight coordinate math to mirror core's getHighlightCoords

## [0.5.8](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.7...v0.5.8) (2026-07-04)

- Re-release

## [0.5.7](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.6...v0.5.7) (2026-07-04)

- Report the true Foldseek hit count instead of the truncated total
- Make the launch-view result tables theme-aware
- Centralize the 1D/MSA launch availability gating and error handling

## [0.5.6](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.5...v0.5.6) (2026-07-04)

- Lane-pack the protein feature tracks, with expandable rows
- Scroll a newly-selected feature into view, and only autoscroll the alignment
  on a large jump rather than on continuous sweeps

## [0.5.5](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.4...v0.5.5) (2026-07-02)

- Scroll the alignment into view instead of re-centering it on every hover

## [0.5.4](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.3...v0.5.4) (2026-07-01)

- Map exon-boundary codons correctly in protein->genome, and shift that
  navigation's locString to 1-based
- Assert the genome<->protein hover directions are mutual inverses

## [0.5.3](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.2...v0.5.3) (2026-06-27)

- Resolve the connected MsaView through the shared genome view on hover
- Map the transcript's entity rather than blindly entity 0
- Pass colorSchemeName as a native MsaView prop, not inside init
- Add the harness app that exercises PDB/AlphaFold structure mapping, deployed
  to GitHub Pages
- Consolidate id patterns and isoform ranking in LaunchProteinView

## [0.5.2](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.1...v0.5.2) (2026-06-27)

- Scroll the alignment to the persistent selection on first load

## [0.5.1](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.0...v0.5.1) (2026-06-27)

- Add a declarative initialSelection, to pre-light a domain on load

## [0.5.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.14...v0.5.0) (2026-06-26)

- Read label_seq_id, not auth_seq_id, on molstar hover and click
- Make ResidueSpec speak native 0-based coordinates, and unify
  highlight/select behind setMolstarLoci
- Fix the ProteinFeatureTrack unhide dead-end, hover marker, and geometry
- Make the 1D launch capability a type requirement

## [0.4.14](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.13...v0.4.14) (2026-06-21)

- Add data-testid/data-feature-\* hooks to FeatureBar

## [0.4.13](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.12...v0.4.13) (2026-06-21)

- Default a connected protein view to a side-by-side split, plus launch settings
- Tolerance-based stable screenshots in the E2E and docs suites

## [0.4.12](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.11...v0.4.12) (2026-06-19)

- Add request cancellation, fix SWR staleness, and rework the structure loader
- Switch the version tooling to sync-version.mjs, which stamps the distconfig
  plugin url

## [0.4.11](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.10...v0.4.11) (2026-06-19)

- Add a short-form declarative launch (uniprotId + transcriptId) and a
  connectedView launch param
- Compactify the protein view header, and add a compact-tracks toggle
- Stop genome hover echoing the codon highlight back onto the LGV
- Dedupe the launch dialog's transcript/isoform and structure-file hooks
- Free the WebGL context, and drop the dead alignment loader
- Fix dead AlphaFold URLs

## [0.4.10](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.9...v0.4.10) (2026-06-04)

- Default the AlphaFold lookup to auto rather than the feature's first
  recognized id

## [0.4.9](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.8...v0.4.9) (2026-06-03)

- Type fixes

## [0.4.8](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.7...v0.4.8) (2026-06-03)

- Add structure color schemes (pLDDT and friends), with a header selector and
  per-residue tracks
- Introduce branded coordinate types and a unified CoordinateMapper
- Make MSA<->structure hover sync gap-aware, on react-msaview's real model API
- Simplify the ProteinView menu: promote the common actions, add an Advanced
  submenu
- Always pair console.error with setError, so a failure is user-visible
- Split the components into smaller files, and add a primaryStructure getter

## [0.4.7](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.6...v0.4.7) (2026-05-29)

- Improve fetch and feature typing, dropping casts and a ts-expect-error
- Dedupe the loci interactivity helpers, and unify clear behavior

## [0.4.6](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.5...v0.4.6) (2026-05-29)

- Gate the selectors on the chosen lookup mode, and drop the hooks that gating
  left dead

## [0.4.5](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.4...v0.4.5) (2026-05-28)

- Simplifications, type fixes, and one bug fix
- Bump puppeteer, and refresh the snapshots

## [0.4.4](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.3...v0.4.4) (2026-05-24)

- Snapshot the coordinate mappings

## [0.4.3](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.2...v0.4.3) (2026-05-21)

- Fix the launch path for the Foldseek and protein view action menus
- Stop shipping source maps

## [0.4.2](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.1...v0.4.2) (2026-05-21)

- Dependency bumps

## [0.4.1](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.0...v0.4.1) (2026-05-21)

- Unify the protein view launch handlers, and dedupe the display-name logic
- Surface launch and lookup errors, and debounce manual UniProt input

## [0.4.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.3.5...v0.4.0) (2026-05-14)

- Make the highlight system declarative, fixing several bugs along the way
- Separate the alignment and feature visibility toggles in the header
- Fix the feature-track genome highlight, and simplify the highlight state
- Consolidate loci interactivity into applyLociInteractivity helpers
- Add follow-cursor genome auto-scroll, then remove it again in favor of the
  explicit toggles
- Fix the E2E tests, and remove dead code and debug logging

## [0.3.5](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.3.4...v0.3.5) (2026-05-05)

- Re-release

## [0.3.4](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.3.3...v0.3.4) (2026-05-05)

- Fix hover sync bugs, and add tests for them

## [0.3.3](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.3.2...v0.3.3) (2026-05-03)

- Dependency bumps

## [0.3.2](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.3.1...v0.3.2) (2026-05-03)

- Show the protein view menu item on canvas-based LinearBasicDisplay gene
  tracks, and guard it on having a launch path
- Migrate to pnpm, and ESLint to flat config with import-x
- Reduce useEffect usage

## [0.3.1](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.3.0...v0.3.1) (2026-04-16)

- Publish with --provenance

## [0.3.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.2.0...v0.3.0) (2026-04-16)

- Publish from CI with npm trusted publishing
- Deduplicate the highlight components, mapping functions and structure
  handling (#34)
- Replace the useEffect anti-patterns with autorun-based MobX tracking
- Add tests for selectBestTranscript
- Run the snapshot tests on a nightly cron job

## [0.2.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.1.0...v0.2.0) (2026-03-03)

- Lazy load protein3d (#31)
- Move the mappings into a global coordinate space
- Fix the tooltip and the pink mouseover on feature tracks
- Fetch the molstar css periodically

## [0.1.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.19...v0.1.0) (2026-01-29)

- Read the version from a generated `version.ts`
- Extract a stripStopCodon util, and improve the UI

## [0.0.19](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.18...v0.0.19) (2026-01-25)

- Simplifications, and fold the lookup into a single hook

## [0.0.18](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.17...v0.0.18) (2026-01-25)

- Dialog styling

## [0.0.17](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.16...v0.0.17) (2026-01-25)

- Query Foldseek (#25), search AlphaFold's API (#26), and use UniProt's ID
  mapping API instead of mygene.info (#27)
- Add a simple 1D viewer embedded in the 3D protein viewer (#24)
- Improve the mouseover behavior from protein3d to the MSA view (#28)
- Add an extension point for launching a protein view from e.g. the URL bar
  (#23)
- Add puppeteer-based tests that run against several JBrowse versions (#29)
- Add local alignment options, so less depends on the REST API

## [0.0.16](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.15...v0.0.16) (2025-12-04)

- Fix a bug in the featureUniprotId logic

## [0.0.15](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.14...v0.0.15) (2025-11-20)

- Let a GFF name its uniprotId fields in column 9 (#22)

## [0.0.14](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.13...v0.0.14) (2025-10-25)

- Fix an off-by-one
- Dependency updates

## [0.0.13](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.12...v0.0.13) (2025-10-14)

- Rework ProteinAlignment, and drop the dead structureModel code

## [0.0.12](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.11...v0.0.12) (2025-10-14)

- Remove the mode selector for now
- Stop the SWR lookups revalidating on focus, reconnect, or staleness

## [0.0.11](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.10...v0.0.11) (2025-10-14)

- Dependency updates

## [0.0.10](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.9...v0.0.10) (2025-10-13)

- Simplify proteinToGenomeMapping

## [0.0.9](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.8...v0.0.9) (2025-10-13)

- Report a 1-based position in the structure tooltip

## [0.0.8](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.7...v0.0.8) (2025-10-09)

- Allow selecting an isoform
- Auto-scroll to the selection
- Add the confidence URL, and a generic assembly name

## [0.0.7](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.6...v0.0.7) (2025-10-07)

- Bump molstar to v5, and add the geo export plugin
- Fix the missing UniProt ID error
- Modularize and simplify the lookup logic

## [0.0.6](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.5...v0.0.6) (2025-05-19)

- Flip the coloring
- Split the watch script

## [0.0.5](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.4...v0.0.5) (2024-11-04)

- Manually supply a UniProt ID
- Unique-ify the trackId and displayIds

## [0.0.4](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.3...v0.0.4) (2024-08-26)

- Launch a protein view from any gene
- Add adapters for UniProt AlphaFold data (#14)
- Convert to mobx-state-tree autoruns instead of useEffect, opening the way to
  displaying multiple structures (#13)
- Only generate tracks for the GFF fields that are available

## [0.0.3](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.2...v0.0.3) (2024-07-16)

- Skip the pairwise alignment when the sequences match exactly, and don't show
  a highlight or alignment for an exact match
- Remove the preloaded concept

## [0.0.2](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.2...v0.0.2) (2024-07-08)

- Initial release: open the AlphaFold or PDB structure for a gene, with the
  structure, the genome and the pairwise alignment linked by mouseover
- Load a structure from a local file
- Report whether a structure exists on AlphaFoldDB
- Build with esbuild for production and development (#9)
- MIT license
