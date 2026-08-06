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
// RESOLVED_CHAIN; if it is a fragment, PARTIAL_OR_REPEAT.
import type { Severity } from './diagnostics'

export interface Example {
  label: string
  source: 'pdb' | 'alphafold'
  structureId: string
  uniprot: string
  /** verdict code this example is meant to surface */
  expect: string
  expectSeverity: Severity
  note: string
  /** human gene symbol, for launching the real plugin in JBrowse (omit if the
   * protein has no human gene, e.g. a viral chain) */
  gene?: string
  /** archive file format to load; mmCIF unless stated. PDB format is the one
   * that can lose entity_poly_seq and fall back to author numbering. */
  format?: 'cif' | 'pdb'
}

export const EXAMPLES: Example[] = [
  {
    label: 'AF p53 (full length)',
    source: 'alphafold',
    structureId: 'P04637',
    uniprot: 'P04637',
    gene: 'TP53',
    expect: 'CLEAN',
    expectSeverity: 'ok',
    note: 'Single chain, fully modeled — the AlphaFold happy path.',
  },
  {
    label: '4HHB → hemoglobin β',
    source: 'pdb',
    structureId: '4HHB',
    uniprot: 'P68871',
    gene: 'HBB',
    expect: 'RESOLVED_CHAIN',
    expectSeverity: 'ok',
    note: 'α/β tetramer, entity[0]=α. The β transcript belongs to entity[1] and chooseMappedEntity finds it — this is the case that used to mis-map.',
  },
  {
    label: '1FIN → cyclin A',
    source: 'pdb',
    structureId: '1FIN',
    uniprot: 'P20248',
    gene: 'CCNA2',
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
    label: '1TUP → p53 (protein/DNA)',
    source: 'pdb',
    structureId: '1TUP',
    uniprot: 'P04637',
    gene: 'TP53',
    expect: 'RESOLVED_CHAIN',
    expectSeverity: 'ok',
    note: 'entity[0] and [1] are DNA strands; p53 is entity[2]. Resolving by alignment skips the DNA chains a positional guess would hit.',
  },
  {
    label: '6M0J → ACE2 (contrast)',
    source: 'pdb',
    structureId: '6M0J',
    uniprot: 'Q9BYF1',
    gene: 'ACE2',
    expect: 'MULTI_ENTITY',
    expectSeverity: 'warn',
    note: 'Here ACE2 IS entity[0] so it maps correctly — but it is still a complex, and crystal disorder may drift the confidence track.',
  },
  {
    label: '1TIT → titin I27',
    source: 'pdb',
    structureId: '1TIT',
    uniprot: 'Q8WZ42',
    gene: 'TTN',
    expect: 'PARTIAL_OR_REPEAT',
    expectSeverity: 'warn',
    note: 'One 98aa Ig domain out of a 34,350aa protein with hundreds of near-identical Ig repeats — local alignment can anchor to the wrong copy.',
  },
  {
    label: '1N11 → ankyrin-1',
    source: 'pdb',
    structureId: '1N11',
    uniprot: 'P16157',
    gene: 'ANK1',
    expect: 'PARTIAL_OR_REPEAT',
    expectSeverity: 'warn',
    note: 'D34 fragment (437aa) of an 1,881aa ankyrin-repeat protein.',
  },
  {
    label: '4INS → insulin (processed)',
    source: 'pdb',
    structureId: '4INS',
    uniprot: 'P01315',
    gene: 'INS',
    expect: 'PARTIAL_OR_REPEAT',
    expectSeverity: 'warn',
    note: 'Proprotein cleaved into A+B chains (separate entities); each covers only a fraction of the UniProt proprotein.',
  },
  {
    label: '1TUP.pdb → p53 (author numbering)',
    source: 'pdb',
    structureId: '1TUP',
    uniprot: 'P04637',
    gene: 'TP53',
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
    gene: 'BRCA2',
    expect: 'AF_FRAGMENT',
    expectSeverity: 'warn',
    note: 'BRCA2 is 3,418aa; AlphaFold serves it in fragments but the plugin only ever loads F1 (~1,400aa). (large — alignment takes a moment)',
  },
]
