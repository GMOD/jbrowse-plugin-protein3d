import pairwiseSeqMap from './pairwiseSeqMap'
import { alignment } from './test_data/gene'

test('test', () => {
  const ret = pairwiseSeqMap(alignment)
  expect(ret).toMatchSnapshot()
})
