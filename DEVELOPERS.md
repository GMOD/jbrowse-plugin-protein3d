# Developing jbrowse-plugin-protein3d

For launching views from URLs or code, see
[docs/launching.md](docs/launching.md) and
[docs/session-snapshots.md](docs/session-snapshots.md). This page covers
building and releasing the plugin itself.

## Running locally

```bash
pnpm install
pnpm start
```

`pnpm start` rebuilds on change and serves the repo on `http://localhost:9000`;
`config.json` loads the plugin from there, so point a JBrowse instance at
`http://localhost:9000/config.json`.

The genome↔structure mapping — the aligner, chain choice, SIFTS, the AlphaFold
and PDBe lookups — lives in the
[`p2s_mapper`](https://github.com/GMOD/p2s_mapper) package, which the plugin
bundles. A change to those rules is made and tested there. [harness/](harness/)
runs that code on real structures without JBrowse.

## Tests and host compatibility

- [Testing](docs/testing.md): the unit and e2e suites, the documentation and
  demo checks, and the screenshot baselines.
- [Host compatibility](docs/host-compatibility.md): why the published bundle has
  to keep working on JBrowse releases years old, and the probe that boots it on
  them before every publish.
- [Live checks](docs/live-checks.md): serving a local build to a session on
  jbrowse.org.

## Publishing

```bash
pnpm version patch
```

`preversion` waits for green CI, lints, builds and boots the bundle on hosted
JBrowse releases; `postversion` pushes the tag, and CI publishes to npm and
writes the GitHub release from `CHANGELOG.md`.
