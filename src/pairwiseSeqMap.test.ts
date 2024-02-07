import { pairwiseSeqMap } from './pairwiseSeqMap'
import { alignment } from './data2'
test('test', () => {
  const ret = pairwiseSeqMap(alignment)
  expect(ret).toMatchSnapshot()
})
