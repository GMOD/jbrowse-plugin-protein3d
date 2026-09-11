import { expect, test } from 'vitest'

import {
  HBB_BETA_4HHB_ENTITY1,
  HBB_TRANSCRIPT_P68871,
  P53_TRANSCRIPT_P04637,
  RPS11_7K00_CHAIN_K,
} from './__fixtures__/structureFixtures'
import {
  MIN_IDENTICAL_RESIDUES,
  alignmentQuality,
  describeAlignmentQuality,
  isLowSimilarity,
} from './alignmentQuality'
import { alignTranscriptToEntity } from './chooseMappedEntity'

import type { PairwiseAlignment } from '../mappings'

const pa = (t: string, s: string): PairwiseAlignment => ({
  consensus: '',
  alns: [
    { id: 'a', seq: t },
    { id: 'b', seq: s },
  ],
})

test('counts aligned, identical and per-row lengths, ignoring case', () => {
  const q = alignmentQuality(pa('MKAA*WYVL-', 'MKaa-WYVLQ'))
  expect(q).toEqual({
    aligned: 8,
    identical: 8,
    transcriptLength: 9,
    structureLength: 9,
    identity: 1,
    identityOverShorter: 8 / 9,
    structureCoverage: 8 / 9,
  })
})

test('an alignment with nothing aligned is zero, not NaN', () => {
  const q = alignmentQuality(pa('MKV---', '---WYL'))
  expect(q.aligned).toBe(0)
  expect(q.identity).toBe(0)
  expect(isLowSimilarity(q)).toBe(true)
  expect(describeAlignmentQuality(q)).toBe('no residues aligned')
})

test('a real match is not flagged, a chance alignment is', () => {
  const good = alignmentQuality(
    alignTranscriptToEntity(
      HBB_TRANSCRIPT_P68871,
      HBB_BETA_4HHB_ENTITY1,
      'smith_waterman',
    )!.alignment,
  )
  expect(good.identity).toBeGreaterThan(0.99)
  expect(isLowSimilarity(good)).toBe(false)
  expect(describeAlignmentQuality(good)).toBe(
    '100% identity over 146 of 146 structure residues',
  )

  // p53 against a ribosomal protein: Smith-Waterman still returns 31
  // identities at about a third identity over the columns it chose, which is
  // why the floor is on identity over the shorter sequence instead
  const chance = alignmentQuality(
    alignTranscriptToEntity(
      P53_TRANSCRIPT_P04637,
      RPS11_7K00_CHAIN_K,
      'smith_waterman',
    )!.alignment,
  )
  expect(chance.identical).toBeGreaterThanOrEqual(MIN_IDENTICAL_RESIDUES)
  expect(chance.identity).toBeGreaterThan(0.3)
  expect(chance.identityOverShorter).toBeLessThan(0.3)
  expect(isLowSimilarity(chance)).toBe(true)
})
