import {
  getGeneticCode,
  parseTranslTable,
} from '@jbrowse/core/util/geneticCodes'
import { describe, expect, it } from 'vitest'

// The table @jbrowse/core/util exported as `defaultCodonTable` up to 4.3.0,
// pinned here so the vendored NCBI strings can't drift from what every released
// host translates with.
const RELEASED_DEFAULT_CODON_TABLE: Record<string, string> = {
  TCA: 'S',
  TCC: 'S',
  TCG: 'S',
  TCT: 'S',
  TTC: 'F',
  TTT: 'F',
  TTA: 'L',
  TTG: 'L',
  TAC: 'Y',
  TAT: 'Y',
  TAA: '*',
  TAG: '*',
  TGC: 'C',
  TGT: 'C',
  TGA: '*',
  TGG: 'W',
  CTA: 'L',
  CTC: 'L',
  CTG: 'L',
  CTT: 'L',
  CCA: 'P',
  CCC: 'P',
  CCG: 'P',
  CCT: 'P',
  CAC: 'H',
  CAT: 'H',
  CAA: 'Q',
  CAG: 'Q',
  CGA: 'R',
  CGC: 'R',
  CGG: 'R',
  CGT: 'R',
  ATA: 'I',
  ATC: 'I',
  ATT: 'I',
  ATG: 'M',
  ACA: 'T',
  ACC: 'T',
  ACG: 'T',
  ACT: 'T',
  AAC: 'N',
  AAT: 'N',
  AAA: 'K',
  AAG: 'K',
  AGC: 'S',
  AGT: 'S',
  AGA: 'R',
  AGG: 'R',
  GTA: 'V',
  GTC: 'V',
  GTG: 'V',
  GTT: 'V',
  GCA: 'A',
  GCC: 'A',
  GCG: 'A',
  GCT: 'A',
  GAC: 'D',
  GAT: 'D',
  GAA: 'E',
  GAG: 'E',
  GGA: 'G',
  GGC: 'G',
  GGG: 'G',
  GGT: 'G',
}

describe('vendored genetic codes', () => {
  it('table 1 matches the codon table released hosts ship', () => {
    const { codonTable } = getGeneticCode(1)
    for (const [codon, aa] of Object.entries(RELEASED_DEFAULT_CODON_TABLE)) {
      expect(codonTable[codon]).toBe(aa)
    }
    expect(Object.keys(RELEASED_DEFAULT_CODON_TABLE)).toHaveLength(64)
  })

  it('resolves every case combination of a codon', () => {
    const { codonTable } = getGeneticCode()
    expect(codonTable.atg).toBe('M')
    expect(codonTable.aTg).toBe('M')
    expect(codonTable.ATG).toBe('M')
  })

  it('vertebrate mitochondrial (2) reassigns TGA and AGA', () => {
    const { codonTable } = getGeneticCode(2)
    expect(codonTable.TGA).toBe('W')
    expect(codonTable.AGA).toBe('*')
    expect(getGeneticCode(1).codonTable.TGA).toBe('*')
  })

  it('falls back to the standard code for an unknown table', () => {
    expect(getGeneticCode(999).codonTable.TGA).toBe('*')
  })

  it('parses transl_table attribute shapes the GFF adapter yields', () => {
    expect(parseTranslTable('2')).toBe(2)
    expect(parseTranslTable(['2'])).toBe(2)
    expect(parseTranslTable(undefined)).toBeUndefined()
    expect(parseTranslTable('not-a-number')).toBeUndefined()
  })
})
