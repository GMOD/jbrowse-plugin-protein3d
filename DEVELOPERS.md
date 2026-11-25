# Developing jbrowse-plugin-protein3d

For launching views from URLs or code, see
[docs/launching.md](docs/launching.md) and [docs/sessions.md](docs/sessions.md).
This page covers building and releasing the plugin itself.

## Running locally

```bash
pnpm install
pnpm start
```

`pnpm start` rebuilds on change and serves the repo on `http://localhost:9000`;
`config.json` loads the plugin from there, so point a JBrowse instance at
`http://localhost:9000/config.json`.

The genome↔structure mapping — the aligner, chain choice, SIFTS, the AlphaFold
and RCSB lookups — lives in the
[`p2s_mapper`](https://github.com/GMOD/p2s_mapper) package, which the plugin
bundles. A change to those rules is made and tested there. [harness/](harness/)
runs that code on real structures without JBrowse.

## Tests and host compatibility

- [Testing](docs/testing.md): the unit and e2e suites, the documentation and
  demo checks, the screenshot baselines, which JBrowse hosts load the published
  bundle, and serving a local build to a session on jbrowse.org.

## Publishing

```bash
pnpm version patch
```

`preversion` waits for green CI, lints, builds and boots the bundle on the
oldest supported, newest and `main` hosted JBrowse builds; `postversion` pushes
the tag, and CI publishes to npm and writes the GitHub release from
`CHANGELOG.md`.
