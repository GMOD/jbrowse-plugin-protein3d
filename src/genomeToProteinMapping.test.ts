import { SimpleFeature } from '@jbrowse/core/util'
import featureData from './data.json'
import { genomeToProteinMapping } from './genomeToProteinMapping'

test('mapping', () => {
  const res = genomeToProteinMapping({
    feature: new SimpleFeature(featureData),
  })
  expect(
    genomeToProteinMapping({ feature: new SimpleFeature(featureData) }),
  ).toMatchSnapshot()
  console.log(res.p2g[0])
})
