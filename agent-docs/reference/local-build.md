# A local build right after an `@jbrowse` release

pnpm quarantines a release for `minimumReleaseAge` minutes. Read the refusal
rather than assuming the number: one day it was 24h here (pnpm's 1440-minute
default) while the sibling jb2hubs checkout refused on a 7-day cutoff, so
`~/.config/pnpm/rc`'s `minimum-release-age=10080` reaches some projects. Inside
the window after `@jbrowse/core`, `app-core` or `plugin-linear-genome-view`
publish, `pnpm install --frozen-lockfile` says "Already up to date" and never
materializes them: `node_modules/@jbrowse/` holds `mobx-state-tree` alone and
`tsc` cannot resolve the imports. CI has no such gating.

`pnpm-workspace.yaml`'s `minimumReleaseAgeExclude` is the list that reliably
opts a package out, which is why `@jbrowse/mobx-state-tree` and `p2s_mapper`
each carry a pin even though the rc exempts `@jbrowse/*` and `@gmod/*`: that
exemption did not cover an unscoped first-party package, and `pnpm config get`
reads undefined for the key in both spellings. With `minimumReleaseAgeStrict`
false, an install that meets a too-new direct dependency appends the pin itself
rather than failing.

Outside the window a cold `pnpm install --frozen-lockfile` followed by
`preversion`'s steps passes locally. Inside it, the dev harness still builds
(esbuild needs only runtime modules, and the `@jbrowse/core` import in
`mappings.ts` is type-only); the ways out are bypassing `minimumReleaseAge` or
linking `@jbrowse/*` to a local `~/src/jbrowse-components` workspace.
