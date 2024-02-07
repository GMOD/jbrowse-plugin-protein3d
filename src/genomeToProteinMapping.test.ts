import { SimpleFeature } from '@jbrowse/core/util'
import featureData from './data.json'
import { genomeToProteinMapping } from './genomeToProteinMapping'

test('mapping', () => {
  expect(
    genomeToProteinMapping({ feature: new SimpleFeature(featureData) }),
  ).toMatchSnapshot()
})
