---
name: view-color-in-the-encoding-spelling
description:
  The ProteinView's `color` and `surface` still use the flat pre-ADR-238
  spelling while its marks and distances use the mark display's `encoding`;
  converting them, with a preProcessSnapshot migration, would leave one spelling
  per view.
---

Since 1.25.0 a mark is `{ site, mark, encoding: { color: { value } } }`, the
spelling jbrowse-components' mark display and ADR-238 use. The view's own color
channel is still flat:

```jsonc
{
  "field": "values",
  "values": {},
  "scale": "threshold",
  "domain": [1.5],
  "range": ["#b9c2cf", "#d1007a"],
  "labels": ["kept", "lost"],
  "title": "CCR5",
}
```

ADR-238's channel would write the same thing as:

```jsonc
{
  "field": "values",
  "values": {},
  "scale": {
    "type": "threshold",
    "domain": [1.5],
    "range": ["#b9c2cf", "#d1007a"],
    "unknown": "#cccccc",
  },
  "legend": { "title": "CCR5", "labels": ["kept", "lost"] },
}
```

and `surface: { opacity }` would become
`surface: { encoding: { opacity: { value } } }`.

## What it buys

- One spelling per view, so a reader who learns the marks reads the color.
- `scale.unknown` names the grey a residue without a value draws
  (`NO_VALUE_COLOR`, `OTHER_CHAIN_COLOR`), which is what the CCR5 figure first
  needed: an unmapped partner chain in its own color.

## What it costs

- `ProteinColor` is read by the color menu, the legend, `colorProblems`,
  `resolvedColor`, the launch parameters (`docs/launch-parameters.md`) and every
  protein figure session in jbrowse-components.
- A design pass first, as ADR-238 itself had: `domainMin`/`domainMax`/
  `domainMid`, `trackId`, `stat` and `values` each need a home, and the launch
  URL's flat parameters may want to stay flat.
- The migration is the same shape as `checkedLayers`: read the flat object in
  `preProcessSnapshot`, write the nested one.

Waiting on Colin's call on whether the view's channel converts, and when.
