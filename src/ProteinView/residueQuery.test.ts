import { expect, test } from 'vitest'

import { parseResidueQuery, residueQueryProblem } from './residueQuery'

import type { Entity } from 'p2s_mapper'

// a construct whose label ids run 1..4, numbered by its authors from 247
const CONSTRUCT: Entity = {
  entityId: '1',
  seq: 'MRKA',
  seqIds: [1, 2, 3, 4],
  authSeqIds: [247, 248, 249, 250],
  chains: ['A', 'B'],
}

test('reads a residue, a lettered residue, a chain and a range', () => {
  expect(parseResidueQuery(' 248 ')).toEqual({
    chain: undefined,
    start: { letter: undefined, number: 248 },
    end: { letter: undefined, number: 248 },
  })
  expect(parseResidueQuery('r248')).toMatchObject({
    start: { letter: 'R', number: 248 },
  })
  expect(parseResidueQuery('A:248')).toMatchObject({ chain: 'A' })
  expect(parseResidueQuery('A:R248 - K249')).toEqual({
    chain: 'A',
    start: { letter: 'R', number: 248 },
    end: { letter: 'K', number: 249 },
  })
  expect(parseResidueQuery('-3--1')).toMatchObject({
    start: { number: -3 },
    end: { number: -1 },
  })
})

test('reads nothing from text that names no residue', () => {
  expect(parseResidueQuery('')).toBeUndefined()
  expect(parseResidueQuery('Arg248')).toBeUndefined()
  expect(parseResidueQuery('248-')).toBeUndefined()
})

test('a residue the mapped entity holds has no problem', () => {
  expect(residueQueryProblem('248', CONSTRUCT)).toBeUndefined()
  expect(residueQueryProblem('B:R248-A250', CONSTRUCT)).toBeUndefined()
  expect(residueQueryProblem('240-248', CONSTRUCT)).toBeUndefined()
})

test('names what is wrong with a residue the entity does not hold', () => {
  expect(residueQueryProblem('Arg248', CONSTRUCT)).toBe(
    'Type a residue number such as 248, R248, A:248 or 245-250',
  )
  expect(residueQueryProblem('248', undefined)).toBe(
    'The structure has not loaded',
  )
  expect(residueQueryProblem('250-248', CONSTRUCT)).toBe(
    '250-248 ends before it starts',
  )
  expect(residueQueryProblem('C:248', CONSTRUCT)).toBe(
    'Chain C is not the mapped chain (A, B)',
  )
  expect(residueQueryProblem('H175', CONSTRUCT)).toBe(
    'No residue numbered H175 in this structure',
  )
  expect(residueQueryProblem('H248', CONSTRUCT)).toBe(
    'Residue 248 is R248, not H248',
  )
})
