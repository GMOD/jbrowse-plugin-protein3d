import {
  genomeToTranscriptSeqMapping,
  structureSeqVsTranscriptSeqMap,
} from './mappings'
import { SimpleFeature } from '@jbrowse/core/util'
import { feature, pairwiseAlignment } from './test_data/gene'

test('test', () => {
  const ret = structureSeqVsTranscriptSeqMap(pairwiseAlignment)
  expect(ret).toMatchSnapshot()
})

test('mapping', () => {
  // @ts-expect-error
  const res = genomeToTranscriptSeqMapping(new SimpleFeature(feature))
  const { p2g } = res
  const aln = structureSeqVsTranscriptSeqMap(pairwiseAlignment)

  // expected position in sequence
  const s2 = pairwiseAlignment.alns[1].seq
  expect(s2[392]).toBe('M')
  expect(s2[393]).toBe('K')
  expect(s2[394]).toBe('A')
  expect(s2[395]).toBe('A')
  // maps the 392 position in the "pdb version of the protein" to the 0th
  // position in the genome version of the protein, and then maps that back to
  // the genome
  const p0 = aln.structureSeqToTranscriptSeqPosition[392]!
  const g0 = p2g[p0]
  expect(p0).toBe(0)
  expect(g0).toBe(51_296_155)
  expect(res).toMatchSnapshot()
})
