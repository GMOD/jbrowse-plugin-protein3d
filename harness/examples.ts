// Curated, RCSB-grounded examples — each chosen to trigger a specific verdict.
// Entity order / UniProt mappings were confirmed against the RCSB data API, so
// the "expect" column is what the harness should actually report.
//
// NOTE the verdicts moved once: while the plugin hardcoded entity [0], every
// heteromer here expected WRONG_CHAIN. chooseMappedEntity now resolves the
// chain by alignment, so those same structures expect RESOLVED_CHAIN — they
// went from demonstrating a bug to demonstrating the fix. WRONG_CHAIN is now a
// regression alarm and no example should produce it.
//
// To add one: pick a PDB, look up its polymer entities at
//   https://data.rcsb.org/rest/v1/core/polymer_entity/<PDBID>/<n>
// note which entity is [0] (mmCIF order) and which UniProt you care about, then
// add a row. If the protein of interest is NOT entity [0], it demonstrates
// RESOLVED_CHAIN; if it is a fragment, PARTIAL_OR_REPEAT. Give it a `launch`
// naming the gene's GENCODE v44 transcript (the MANE Select one, from the
// harness config's track) so the ↗ JBrowse link opens the structure mapped.
import type { Severity } from './diagnostics'

export interface Launch {
  gene: string
  /** a transcript ID in the harness config's GENCODE v44 track */
  transcriptId: string
  /** hg38 locus holding the transcript */
  loc: string
  /** inclusive author residue numbers selected on load */
  initialResidues?: { start: number; end: number }
  /** AlphaFold models of other UniProt entries superposed on the structure */
  superpose?: string[]
}

export interface Example {
  label: string
  source: 'pdb' | 'alphafold'
  structureId: string
  uniprot: string
  /** verdict code this example is meant to surface */
  expect: string
  expectSeverity: Severity
  note: string
  /** opens the structure beside its human gene in JBrowse (omit if the protein
   * has no human gene, e.g. a viral chain) */
  launch?: Launch
  /** archive file format to load; mmCIF unless stated. PDB format is the one
   * that can lose entity_poly_seq and fall back to author numbering. */
  format?: 'cif' | 'pdb'
}

const TP53 = {
  gene: 'TP53',
  transcriptId: 'ENST00000269305.9',
  loc: 'chr17:7,661,779-7,687,546',
}

export const EXAMPLES: Example[] = [
  {
    label: 'AF p53 (full length)',
    source: 'alphafold',
    structureId: 'P04637',
    uniprot: 'P04637',
    launch: TP53,
    expect: 'CLEAN',
    expectSeverity: 'ok',
    note: 'Single chain, fully modeled — the AlphaFold happy path.',
  },
  {
    label: 'AF p53 + mouse p53 (superposed)',
    source: 'alphafold',
    structureId: 'P04637',
    uniprot: 'P04637',
    launch: { ...TP53, superpose: ['P02340'] },
    expect: 'CLEAN',
    expectSeverity: 'ok',
    note: 'The JBrowse link superposes the mouse AlphaFold model on the human one with TM-align and maps both to the human transcript, the mouse at about 79% identity. AlphaFold models are all entity 1, so hovering one must not light the other.',
  },
  {
    label: '4HHB → hemoglobin β',
    source: 'pdb',
    structureId: '4HHB',
    uniprot: 'P68871',
    launch: {
      gene: 'HBB',
      transcriptId: 'ENST00000335295.4',
      loc: 'chr11:5,225,464-5,229,395',
    },
    expect: 'RESOLVED_CHAIN',
    expectSeverity: 'ok',
    note: 'α/β tetramer, entity[0]=α. The β transcript belongs to entity[1] and chooseMappedEntity finds it — this is the case that used to mis-map.',
  },
  {
    label: '1FIN → cyclin A',
    source: 'pdb',
    structureId: '1FIN',
    uniprot: 'P20248',
    launch: {
      gene: 'CCNA2',
      transcriptId: 'ENST00000274026.10',
      loc: 'chr4:121,815,710-121,823,936',
    },
    expect: 'RESOLVED_CHAIN',
    expectSeverity: 'ok',
    note: 'CDK2–cyclin A complex, entity[0]=CDK2. A cyclin transcript resolves to the cyclin entity instead of mis-mapping onto CDK2.',
  },
  {
    label: '6M0J → SARS-CoV-2 spike',
    source: 'pdb',
    structureId: '6M0J',
    uniprot: 'P0DTC2',
    expect: 'RESOLVED_CHAIN',
    expectSeverity: 'ok',
    note: 'entity[0]=human ACE2; the spike RBD is entity[1]. (viral chain — no human gene to launch from)',
  },
  {
    label: '1TUP → p53 R248 (protein/DNA)',
    source: 'pdb',
    structureId: '1TUP',
    uniprot: 'P04637',
    launch: { ...TP53, initialResidues: { start: 248, end: 248 } },
    expect: 'RESOLVED_CHAIN',
    expectSeverity: 'ok',
    note: 'entity[0] and [1] are DNA strands; p53 is entity[2]. Resolving by alignment skips the DNA chains a positional guess would hit. The JBrowse link opens with author residue 248 selected, the hotspot papers cite as R248, which is structure position 154.',
  },
  {
    label: '2L14 → p53 TAD (NMR, 20 models)',
    source: 'pdb',
    structureId: '2L14',
    uniprot: 'P04637',
    launch: TP53,
    expect: 'RESOLVED_CHAIN',
    expectSeverity: 'ok',
    note: "NMR ensemble: p53's transactivation domain (13–61) bound to mouse CBP, entity[0]. The plugin loads all twenty models as separate Mol* structures, and colour, hover and selection reach every one. This harness introspects the first model only.",
  },
  {
    label: '6M0J → ACE2 (contrast)',
    source: 'pdb',
    structureId: '6M0J',
    uniprot: 'Q9BYF1',
    launch: {
      gene: 'ACE2',
      transcriptId: 'ENST00000252519.8',
      loc: 'chrX:15,494,290-15,607,236',
    },
    expect: 'MULTI_ENTITY',
    expectSeverity: 'warn',
    note: 'Here ACE2 IS entity[0] so it maps correctly — but it is still a complex, and crystal disorder may drift the confidence track.',
  },
  {
    label: '1TIT → titin I27',
    source: 'pdb',
    structureId: '1TIT',
    uniprot: 'Q8WZ42',
    launch: {
      gene: 'TTN',
      transcriptId: 'ENST00000589042.5',
      loc: 'chr2:178,525,989-178,830,802',
    },
    expect: 'PARTIAL_OR_REPEAT',
    expectSeverity: 'warn',
    note: 'One 98aa Ig domain out of a 34,350aa protein with hundreds of near-identical Ig repeats — local alignment can anchor to the wrong copy.',
  },
  {
    label: '1N11 → ankyrin-1',
    source: 'pdb',
    structureId: '1N11',
    uniprot: 'P16157',
    launch: {
      gene: 'ANK1',
      transcriptId: 'ENST00000289734.13',
      loc: 'chr8:41,653,220-41,896,812',
    },
    expect: 'PARTIAL_OR_REPEAT',
    expectSeverity: 'warn',
    note: 'D34 fragment (437aa) of an 1,881aa ankyrin-repeat protein.',
  },
  {
    label: '4INS → insulin (processed)',
    source: 'pdb',
    structureId: '4INS',
    uniprot: 'P01315',
    launch: {
      gene: 'INS',
      transcriptId: 'ENST00000381330.5',
      loc: 'chr11:2,159,779-2,161,221',
    },
    expect: 'PARTIAL_OR_REPEAT',
    expectSeverity: 'warn',
    note: 'Proprotein cleaved into A+B chains (separate entities); each covers only a fraction of the UniProt proprotein.',
  },
  {
    label: '1TUP.pdb → p53 (author numbering)',
    source: 'pdb',
    structureId: '1TUP',
    uniprot: 'P04637',
    launch: TP53,
    format: 'pdb',
    expect: 'RESOLVED_CHAIN',
    expectSeverity: 'ok',
    note: 'Same entry served as PDB format rather than mmCIF. p53 chains are numbered from UniProt 94; molstar keeps SEQRES here so ids still run 1..N, but strip SEQRES (any trimmed/modeled file) and they become 94.. — which is why residue ids are looked up rather than derived as position+1.',
  },
  {
    label: 'AF BRCA2 (>2700aa)',
    source: 'alphafold',
    structureId: 'P51587',
    uniprot: 'P51587',
    launch: {
      gene: 'BRCA2',
      transcriptId: 'ENST00000380152.8',
      loc: 'chr13:32,315,086-32,400,268',
    },
    expect: 'AF_FRAGMENT',
    expectSeverity: 'warn',
    note: 'BRCA2 is 3,418aa; AlphaFold serves it in fragments but the plugin only ever loads F1 (~1,400aa). (large — alignment takes a moment)',
  },
]
