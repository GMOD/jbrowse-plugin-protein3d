import { expect, test } from 'vitest'

import {
  getAlphaFoldStructureUrl,
  getPdbIdFromUrl,
  getPdbStructureUrl,
} from './structureUrls'

test('recognizes pdb archive urls', () => {
  expect(getPdbIdFromUrl(getPdbStructureUrl('1TUP'))).toBe('1tup')
  expect(getPdbIdFromUrl('https://files.rcsb.org/download/4hhb.cif')).toBe(
    '4hhb',
  )
  expect(
    getPdbIdFromUrl('https://files.rcsb.org/download/pdb1tup.ent.gz'),
  ).toBe('1tup')
  expect(
    getPdbIdFromUrl(
      'https://www.ebi.ac.uk/pdbe/entry-files/download/1tup_updated.cif',
    ),
  ).toBe('1tup')
})

test('ignores non-pdb urls', () => {
  // an alphafold model is handled by its own uniprot-id parser
  expect(getPdbIdFromUrl(getAlphaFoldStructureUrl('P04637'))).toBeUndefined()
  // a user file that merely looks like a pdb id must not inherit annotations
  expect(getPdbIdFromUrl('https://example.com/data/1tup.cif')).toBeUndefined()
  expect(
    getPdbIdFromUrl('https://files.rcsb.org/download/mymodel.cif'),
  ).toBeUndefined()
  // pdb ids never start with 0
  expect(
    getPdbIdFromUrl('https://files.rcsb.org/download/0abc.cif'),
  ).toBeUndefined()
  expect(getPdbIdFromUrl('not a url')).toBeUndefined()
})
