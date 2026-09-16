import { describe, expect, it } from 'vitest'

import {
  parseEntryMolecules,
  pdbeEntryMoleculesUrl,
} from './pdbeEntryMolecules'

// trimmed from the live response for 6zio and 1tup
const NRAS_ENTRY = {
  '6zio': [
    {
      molecule_type: 'polypeptide(L)',
      entity_id: 1,
      in_chains: ['A', 'B'],
      sequence: 'GMTEYKLVVVGAGGVGKSA',
    },
    { molecule_type: 'Bound', entity_id: 2, sequence: null },
  ],
}

const P53_ENTRY = {
  '1tup': [
    { molecule_type: 'polypeptide(L)', entity_id: 1, sequence: 'SSSVPSQKTYQ' },
    {
      molecule_type: 'polydeoxyribonucleotide',
      entity_id: 2,
      sequence: 'AATG',
    },
  ],
}

describe('parseEntryMolecules', () => {
  it('returns one sequence per protein entity', () => {
    expect(parseEntryMolecules(NRAS_ENTRY)).toEqual(['GMTEYKLVVVGAGGVGKSA'])
  })

  it('leaves out nucleic acids, whose letters are amino acids too', () => {
    expect(parseEntryMolecules(P53_ENTRY)).toEqual(['SSSVPSQKTYQ'])
  })

  it('answers empty for a shape it does not recognise', () => {
    expect(parseEntryMolecules(undefined)).toEqual([])
    expect(parseEntryMolecules({ '1abc': 'not an array' })).toEqual([])
    expect(parseEntryMolecules({ '1abc': [null, 42] })).toEqual([])
  })
})

describe('pdbeEntryMoleculesUrl', () => {
  it('lowercases the id, which is what the api answers to', () => {
    expect(pdbeEntryMoleculesUrl('6ZIO')).toBe(
      'https://www.ebi.ac.uk/pdbe/api/pdb/entry/molecules/6zio',
    )
  })
})
