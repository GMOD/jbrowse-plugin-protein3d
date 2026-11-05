import { expect, test } from 'vitest'

import {
  describeSuperposition,
  dissimilarFold,
  shortChain,
  superpositionChip,
} from './superpositionOutcome'

const pivot = { label: 'AF-P01111-F1', chain: 'A' }
const peptide = { label: '7OW4', chain: 'C' }

test('the shorter chain decides whether TM-align can place it', () => {
  expect(
    shortChain({ ...pivot, residues: 189 }, { ...peptide, residues: 8 }),
  ).toEqual({ kind: 'short', residues: 8, of: peptide })
  expect(
    shortChain({ ...pivot, residues: 189 }, { ...peptide, residues: 166 }),
  ).toBeUndefined()
})

test('a TM-score under one half is no shared fold', () => {
  expect(dissimilarFold(0.27)).toEqual({ kind: 'dissimilar', tmScore: 0.27 })
  expect(dissimilarFold(0.87)).toBeUndefined()
})

test('a fit on residue pairs says why and on how many', () => {
  const outcome = {
    method: 'residue-pairs',
    structure: peptide,
    pivot,
    reason: { kind: 'short', residues: 8, of: peptide },
    pairs: { count: 8, rmsd: 4.62 },
  } as const
  expect(describeSuperposition(outcome)).toBe(
    '7OW4 chain C has 8 traced residues, too few for TM-align to place it, so 7OW4 chain C was superposed on AF-P01111-F1 chain A by the 8 residues aligned to the same transcript positions (RMSD 4.62 Å).',
  )
  expect(superpositionChip(outcome)).toBe('fit on 8 residues')
})

test('a TM-align placement reads its numbers and earns no chip', () => {
  const outcome = {
    method: 'tm-align',
    structure: { label: '9BTM', chain: 'A' },
    pivot,
    tmScore: 0.94,
    rmsd: 0.79,
    alignedLength: 168,
    pairs: { count: 168, rmsd: 0.8 },
  } as const
  expect(describeSuperposition(outcome)).toBe(
    'Superposed 9BTM chain A on AF-P01111-F1 chain A by TM-align: TM-score 0.94, RMSD 0.79 Å over 168 aligned residues; 168 residues aligned to the same transcript position sit 0.80 Å apart.',
  )
  expect(superpositionChip(outcome)).toBeUndefined()
})
