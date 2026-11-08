# The 1D protein view, with the measurements

## Its residue is not the transcript's

The 1D view shows a UniProt entry; the transcript it was launched from may be
another isoform. Using one position for both, TP53's Δ133 isoform
(ENST00000504937) lit serine 116 for the R248 codon, and 16 of 261 residues
landed right. The right-clicked isoform is the dialog's default, so no further
choice was needed to hit it, and a Foldseek hit linked the transcript to another
protein altogether.

`withProteinLinkage` (`src/Protein1DLinkage/`) aligns the two in `afterAttach`
and keeps the alignment volatile (`resolveLinkageAlignment`, over the host in
`sessionLinkageHost`). Nothing is saved: the temporary assembly fetches the
entry afresh on every load, so a stored alignment could describe a sequence the
view no longer shows. Unaligned, pending or failed, both directions light
nothing. Smith-Waterman stays: a global alignment stretches p53β's ten private
C-terminal residues across to the entry's end.

The alignment keeps only stretches the two isoforms spell letter for letter
(p2s_mapper's shared-stretches rule). A mutually exclusive exon aligns column
for column against its partner, so a PKM1 transcript on PKM2's entry lit each
exon 9 codon's exon 10 counterpart; 45 of 531 residues are now unmapped, the
same set a global alignment keeps. The rule is not applied to a structure, where
a mismatch is usually a construct's point mutation in the right place, nor to a
homolog: a Foldseek hit opens another species' protein, whose scattered
substitutions the rule shreds (mouse TP53 keeps 41%, BRCA1 9%), so
`isoformAlignment` keeps the rule's result only where it retains 80% of the
mapping. Isoform pairs measured 92–100%; a near-identical ortholog (mouse BRAF,
92%) loses a few residues beside its substitutions and maps nothing wrongly.

The launch strips an isoform suffix (`P04637-7`), whose UniProt GFF is a header
alone, and opens the entry. A hover names no view, so every 1D view of an entry
launched from the genome view answers, with shared codons merged.

The e2e leg `aligns a 1D protein view to its UniProt entry on the host` covers
`afterAttach` composing with the genome view's own and the sequence fetch from
the temporary assembly. NRAS's transcript is its entry, so the leg takes the
identity path: the worker alignment and a real hover on a 1D view have run on no
host.

## Its tracks

The launch hands each track's config to the view's `launchTrack` as
`inlineConf`, so the config rides on the track node and leaves with the view
(ADR-084 in jbrowse-components). Parking about 17 configs per entry in
`sessionTracks` made the host reject them for a temporary assembly, one console
error per track, and the view opened empty; `ProteinAnnotationSession` has no
`addSessionTrackConf`, so the type refuses that path. Consequences:

- The track selector lists `session.tracks` only, so a closed 1D track cannot be
  reopened; the launch opens every track.
- The UniProt feature types are sections of one track: a page gets 16 WebGL2
  contexts, and TP53's nineteen tracks wedged the page blank.
- Every launch fetches the feature types and opens its own tracks under ids
  prefixed with the view's id. Only the temporary assembly is shared, because
  adding it twice makes the host warn.
- `launchTrack`, not `showTrack`: `showTrack` returns undefined and defers when
  the display's state model is still lazy. The host snackbars a config it
  rejects and resolves undefined; the launch reports only a rejection, by track
  name, and keeps opening the rest.

## Closing it makes the host warn

Closing the 1D view makes the host warn once per display that it "is no longer
part of a state tree … Subpath: 'configuration'" (nightly 5.0.0-beta.11, view
idle), so the e2e leg leaves the view open. Whether a view of session tracks
warns the same way was not measured; an inline config dying with its track is
the likely difference, which would make it a host bug in the ADR-084 path.
