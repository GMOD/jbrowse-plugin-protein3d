// Curated, RCSB-grounded examples — each chosen to trigger a specific verdict.
// Entity order / UniProt mappings were confirmed against the RCSB data API, so
// the "expect" column is what the harness should actually report.
//
// To add one: pick a PDB, look up its polymer entities at
//   https://data.rcsb.org/rest/v1/core/polymer_entity/<PDBID>/<n>
// note which entity is [0] (mmCIF order) and which UniProt you care about, then
// add a row. If the protein of interest is NOT entity [0], it demonstrates
// WRONG_CHAIN; if it is [0] but partial, DISORDER_DRIFT / PARTIAL_OR_REPEAT.
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
}

export const EXAMPLES: Example[] = [
  {
    label: 'AF p53 (full length)',
    source: 'alphafold',
    structureId: 'P04637',
    uniprot: 'P04637',
    expect: 'CLEAN',
    expectSeverity: 'ok',
    note: 'Single chain, fully modeled — the AlphaFold happy path.',
  },
  {
    label: '4HHB → hemoglobin β',
    source: 'pdb',
    structureId: '4HHB',
    uniprot: 'P68871',
    expect: 'WRONG_CHAIN',
    expectSeverity: 'error',
    note: 'α/β tetramer. Plugin maps entity[0]=α; the β transcript belongs to entity[1].',
  },
  {
    label: '1FIN → cyclin A',
    source: 'pdb',
    structureId: '1FIN',
    uniprot: 'P20248',
    expect: 'WRONG_CHAIN',
    expectSeverity: 'error',
    note: 'CDK2–cyclin A complex. entity[0]=CDK2, so a cyclin transcript mis-maps.',
  },
  {
    label: '6M0J → SARS-CoV-2 spike',
    source: 'pdb',
    structureId: '6M0J',
    uniprot: 'P0DTC2',
    expect: 'WRONG_CHAIN',
    expectSeverity: 'error',
    note: 'entity[0]=human ACE2; the spike RBD is entity[1].',
  },
  {
    label: '1TUP → p53 (protein/DNA)',
    source: 'pdb',
    structureId: '1TUP',
    uniprot: 'P04637',
    expect: 'WRONG_CHAIN',
    expectSeverity: 'error',
    note: 'entity[0] and [1] are DNA strands; p53 is entity[2]. Plugin tries to map protein onto a DNA chain.',
  },
  {
    label: '6M0J → ACE2 (contrast)',
    source: 'pdb',
    structureId: '6M0J',
    uniprot: 'Q9BYF1',
    expect: 'MULTI_ENTITY',
    expectSeverity: 'warn',
    note: 'Here ACE2 IS entity[0] so it maps correctly — but it is still a complex, and crystal disorder may drift the confidence track.',
  },
  {
    label: '1TIT → titin I27',
    source: 'pdb',
    structureId: '1TIT',
    uniprot: 'Q8WZ42',
    expect: 'PARTIAL_OR_REPEAT',
    expectSeverity: 'warn',
    note: 'One 98aa Ig domain out of a 34,350aa protein with hundreds of near-identical Ig repeats — local alignment can anchor to the wrong copy.',
  },
  {
    label: '1N11 → ankyrin-1',
    source: 'pdb',
    structureId: '1N11',
    uniprot: 'P16157',
    expect: 'PARTIAL_OR_REPEAT',
    expectSeverity: 'warn',
    note: 'D34 fragment (437aa) of an 1,881aa ankyrin-repeat protein.',
  },
  {
    label: '4INS → insulin (processed)',
    source: 'pdb',
    structureId: '4INS',
    uniprot: 'P01315',
    expect: 'PARTIAL_OR_REPEAT',
    expectSeverity: 'warn',
    note: 'Proprotein cleaved into A+B chains (separate entities); each covers only a fraction of the UniProt proprotein.',
  },
  {
    label: 'AF BRCA2 (>2700aa)',
    source: 'alphafold',
    structureId: 'P51587',
    uniprot: 'P51587',
    expect: 'AF_FRAGMENT',
    expectSeverity: 'warn',
    note: 'BRCA2 is 3,418aa; AlphaFold serves it in fragments but the plugin only ever loads F1 (~1,400aa). (large — alignment takes a moment)',
  },
]
