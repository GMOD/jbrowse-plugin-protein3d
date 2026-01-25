import { SimpleFeature } from '@jbrowse/core/util'
import { describe, expect, test } from 'vitest'

import { getUniProtIdFromFeature } from './util'

describe('getUniProtIdFromFeature', () => {
  test('returns undefined for undefined feature', () => {
    expect(getUniProtIdFromFeature(undefined)).toBeUndefined()
  })

  test('returns uniprot attribute when present', () => {
    const feature = new SimpleFeature({
      uniqueId: 'test-1',
      refName: 'chr1',
      start: 0,
      end: 100,
      uniprot: 'P12345',
    })
    expect(getUniProtIdFromFeature(feature)).toBe('P12345')
  })

  test('returns uniprotId attribute when uniprot is missing', () => {
    const feature = new SimpleFeature({
      uniqueId: 'test-2',
      refName: 'chr1',
      start: 0,
      end: 100,
      uniprotId: 'Q67890',
    })
    expect(getUniProtIdFromFeature(feature)).toBe('Q67890')
  })

  test('returns uniprotid attribute (lowercase) when others are missing', () => {
    const feature = new SimpleFeature({
      uniqueId: 'test-3',
      refName: 'chr1',
      start: 0,
      end: 100,
      uniprotid: 'A11111',
    })
    expect(getUniProtIdFromFeature(feature)).toBe('A11111')
  })

  test('prefers uniprot over uniprotId', () => {
    const feature = new SimpleFeature({
      uniqueId: 'test-4',
      refName: 'chr1',
      start: 0,
      end: 100,
      uniprot: 'P12345',
      uniprotId: 'Q67890',
    })
    expect(getUniProtIdFromFeature(feature)).toBe('P12345')
  })

  test('prefers uniprotId over uniprotid', () => {
    const feature = new SimpleFeature({
      uniqueId: 'test-5',
      refName: 'chr1',
      start: 0,
      end: 100,
      uniprotId: 'Q67890',
      uniprotid: 'A11111',
    })
    expect(getUniProtIdFromFeature(feature)).toBe('Q67890')
  })

  test('returns undefined when no uniprot attribute present', () => {
    const feature = new SimpleFeature({
      uniqueId: 'test-6',
      refName: 'chr1',
      start: 0,
      end: 100,
      gene_name: 'BRCA1',
    })
    expect(getUniProtIdFromFeature(feature)).toBeUndefined()
  })

  test('handles GFF-style feature with uniprot in attributes', () => {
    const feature = new SimpleFeature({
      uniqueId: 'gene-ENSG00000012345',
      refName: 'chr17',
      start: 1000,
      end: 5000,
      type: 'gene',
      gene_name: 'TP53',
      uniprot: 'P04637',
    })
    expect(getUniProtIdFromFeature(feature)).toBe('P04637')
  })
})
