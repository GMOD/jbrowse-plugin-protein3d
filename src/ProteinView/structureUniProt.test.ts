import { expect, test } from 'vitest'

import { structureUniProt } from './structureUniProt'

const none = {
  uniProtMappings: undefined,
  uniProtMappingsError: undefined,
  mappedEntity: undefined,
}

test('an AlphaFold model is its UniProt entry, position for position', () => {
  const entry = structureUniProt({
    ...none,
    uniprotId: 'P04637',
    pdbId: undefined,
  })
  expect(entry.uniprotId).toBe('P04637')
  expect(entry.isLoading).toBe(false)
  expect(entry.mapUniProtPosition(248)).toBe(247)
})

// 1TUP's position 154 is residue 248: named beside its accession, the entry
// used to take the 1:1 map and draw every UniProt feature 94 residues off
test('a PDB entry named beside an accession still waits on SIFTS', () => {
  const entry = structureUniProt({
    ...none,
    uniprotId: 'P04637',
    pdbId: '1tup',
  })
  expect(entry.uniprotId).toBeUndefined()
  expect(entry.isLoading).toBe(true)
})
