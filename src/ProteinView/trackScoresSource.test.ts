import { SimpleFeature } from '@jbrowse/core/util'
import { expect, test } from 'vitest'

import {
  numberOfField,
  readFeatureField,
  trackValuesByResidue,
} from './trackScoresSource'
import { VariantEffectRefusal } from './variantEffects'

const p2gCodon = { 0: [100, 101, 102], 1: [103, 104, 105], 2: [106, 107, 108] }

// what CoreGetFeatures hands back for a VCF record: VcfFeature's toJSON, with
// QUAL and INFO and no score
function variant(uniqueId: string, pos: number, INFO: Record<string, unknown>) {
  return new SimpleFeature({
    uniqueId,
    refName: 'chr1',
    start: pos,
    end: pos + 1,
    REF: 'A',
    ALT: ['G'],
    QUAL: 50,
    INFO,
  })
}

test('a VCF record carries no score, so reading score finds nothing', () => {
  expect(variant('a', 100, { AF: [0.1] }).get('score')).toBeUndefined()
})

test('reads a dotted field into a structured one, and an allele by index', () => {
  const f = variant('a', 100, { AF: [0.1, 0.3], 'AF.EAS': [0.2] })
  expect(readFeatureField(f, 'QUAL')).toBe(50)
  expect(readFeatureField(f, 'INFO.AF')).toEqual([0.1, 0.3])
  expect(readFeatureField(f, 'INFO.AF.1')).toBe(0.3)
  expect(readFeatureField(f, 'INFO.DP')).toBeUndefined()
  expect(readFeatureField(f, 'QUAL.x')).toBeUndefined()
})

test('a multi-allelic list gives its highest number, and an untyped string reads as one', () => {
  expect(numberOfField([0.01, 0.2, undefined])).toBe(0.2)
  expect(numberOfField(['0.5'])).toBe(0.5)
  expect(numberOfField(7)).toBe(7)
  expect(numberOfField(true)).toBeNaN()
  expect(numberOfField(['', 'benign'])).toBeNaN()
  expect(numberOfField([])).toBeNaN()
})

test('count gives every residue a value, 0 where no feature falls', () => {
  const byPosition = trackValuesByResidue({
    features: [
      variant('a', 100, {}),
      variant('b', 102, {}),
      variant('c', 104, {}),
    ],
    p2gCodon,
    stat: 'count',
    trackId: 'cohort',
  })
  expect([...byPosition]).toEqual([
    [0, 2],
    [1, 1],
    [2, 0],
  ])
})

test('count takes a feature returned for two coding spans once', () => {
  const twice = variant('a', 101, {})
  expect(
    trackValuesByResidue({
      features: [twice, twice],
      p2gCodon,
      stat: 'count',
      trackId: 'cohort',
    }).get(0),
  ).toBe(1)
})

test('a named INFO field is read as the score, a multi-allelic site by its highest allele', () => {
  const byPosition = trackValuesByResidue({
    features: [
      variant('a', 100, { AF: [0.01, 0.2] }),
      variant('b', 104, { AF: [0.05] }),
    ],
    p2gCodon,
    stat: 'max',
    scoreField: 'INFO.AF',
    trackId: 'gnomad',
  })
  expect(byPosition.get(0)).toBe(0.2)
  expect(byPosition.get(1)).toBe(0.05)
  expect(byPosition.has(2)).toBe(false)
})

test('a track whose features carry no score says so and how to read them', () => {
  const read = () =>
    trackValuesByResidue({
      features: [variant('a', 100, { AF: [0.1] })],
      p2gCodon,
      stat: 'mean',
      trackId: 'dog10k',
    })
  expect(read).toThrow(VariantEffectRefusal)
  expect(read).toThrow(
    'Track "dog10k"\'s 1 features under this transcript carry no number in score; name the field to read with scoreField, such as INFO.AF, or count the features with stat "count"',
  )
})

test('a named field no feature carries says so without the hint', () => {
  expect(() =>
    trackValuesByResidue({
      features: [variant('a', 100, { AF: [0.1] })],
      p2gCodon,
      stat: 'mean',
      scoreField: 'INFO.DP',
      trackId: 'dog10k',
    }),
  ).toThrow(
    'Track "dog10k"\'s 1 features under this transcript carry no number in INFO.DP',
  )
})

test('a track with no features under the transcript says so rather than counting zeros', () => {
  expect(() =>
    trackValuesByResidue({
      features: [],
      p2gCodon,
      stat: 'count',
      trackId: 'cohort',
    }),
  ).toThrow(
    'Track "cohort" has no features under this transcript\'s coding bases',
  )
})

test('a bigWig feature still reads its score', () => {
  const bin = new SimpleFeature({
    uniqueId: 'bin',
    refName: 'chr1',
    start: 100,
    end: 106,
    score: 3,
  })
  const byPosition = trackValuesByResidue({
    features: [bin],
    p2gCodon,
    stat: 'mean',
    trackId: 'phyloP',
  })
  expect([...byPosition]).toEqual([
    [0, 3],
    [1, 3],
  ])
})
