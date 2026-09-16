import { expect, test } from 'vitest'

import { isPdbId, parseBestStructures } from './pdbeBestStructures'

// Rows lifted from PDBe's response for P68871 (hemoglobin β) and P04637.
const response = {
  P68871: [
    {
      pdb_id: '1dxt',
      chain_id: 'B',
      experimental_method: 'X-ray diffraction',
      resolution: 1.7,
      tax_id: 9606,
      unp_start: 2,
      unp_end: 147,
      start: 1,
      end: 146,
      coverage: 0.993,
    },
    {
      pdb_id: '1dxt',
      chain_id: 'D',
      experimental_method: 'X-ray diffraction',
      resolution: 1.7,
      tax_id: 9606,
      unp_start: 2,
      unp_end: 147,
      start: 1,
      end: 146,
      coverage: 0.993,
    },
    {
      pdb_id: '2h35',
      chain_id: 'B',
      experimental_method: 'Solution NMR',
      resolution: null,
      tax_id: 9606,
      unp_start: 2,
      unp_end: 147,
      start: 1,
      end: 146,
      coverage: 0.993,
    },
    { pdb_id: 'bad', chain_id: 'A' },
  ],
}

test('one entry per PDB id, chains merged, PDBe order kept', () => {
  const entries = parseBestStructures(response)
  expect(entries.map(e => e.pdbId)).toEqual(['1dxt', '2h35'])
  expect(entries[0]).toEqual({
    pdbId: '1dxt',
    experimentalMethod: 'X-ray diffraction',
    resolution: 1.7,
    unpStart: 2,
    unpEnd: 147,
    coverage: 0.993,
    chains: ['B', 'D'],
  })
})

test('an NMR entry has no resolution rather than a null one', () => {
  const [, nmr] = parseBestStructures(response)
  expect(nmr?.experimentalMethod).toBe('Solution NMR')
  expect(nmr).not.toHaveProperty('resolution')
})

test('anything that is not a keyed list of rows parses to nothing', () => {
  expect(parseBestStructures(undefined)).toEqual([])
  expect(parseBestStructures({ P04637: 'nope' })).toEqual([])
  expect(parseBestStructures([])).toEqual([])
})

test('a PDB ID is four characters beginning with a digit', () => {
  expect(isPdbId('1TUP')).toBe(true)
  expect(isPdbId('6zio')).toBe(true)
})

test('a prefix on the way to a PDB ID is not one, so it never reaches a fetch', () => {
  expect(isPdbId('1TU')).toBe(false)
  expect(isPdbId('1TUPX')).toBe(false)
  expect(isPdbId('0TUP')).toBe(false)
  expect(isPdbId('ATUP')).toBe(false)
  expect(isPdbId('')).toBe(false)
})
