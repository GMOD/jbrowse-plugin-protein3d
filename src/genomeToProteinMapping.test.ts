import { SimpleFeature } from '@jbrowse/core/util'
import { genomeToProteinMapping } from './genomeToProteinMapping'
import { feature, alignment } from './test_data/gene'
import pairwiseSeqMap from './pairwiseSeqMap'

test('mapping', () => {
  const res = genomeToProteinMapping({
    feature: new SimpleFeature(feature),
  })
  const { p2g } = res
  const aln = pairwiseSeqMap(alignment)

  // expected position in sequence
  const s2 = alignment.alns[1].seq
  expect(s2[392]).toBe('M')
  expect(s2[393]).toBe('K')
  expect(s2[394]).toBe('A')
  expect(s2[395]).toBe('A')
  // maps the 392 position in the "pdb version of the protein" to the 0th
  // position in the genome version of the protein, and then maps that back to
  // the genome
  const p0 = aln.coord1[392]!
  const g0 = p2g[p0]
  expect(p0).toBe(0)
  expect(g0).toBe(51_296_155)
  expect(res).toMatchSnapshot()
})
