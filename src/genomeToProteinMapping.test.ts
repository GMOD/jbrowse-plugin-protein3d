import { SimpleFeature } from '@jbrowse/core/util'
import { genomeToProteinMapping } from './genomeToProteinMapping'
import { feature } from './data2'

test('mapping', () => {
  const res = genomeToProteinMapping({
    feature: new SimpleFeature(feature),
  })
  expect(res).toMatchSnapshot()
})
