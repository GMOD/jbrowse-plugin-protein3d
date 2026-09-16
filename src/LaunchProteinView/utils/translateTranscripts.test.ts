import { SimpleFeature } from '@jbrowse/core/util'
import { describe, expect, it } from 'vitest'

import { translateTranscripts } from './calculateProteinSequence'

// ATG AAA TAA on the plus strand, padded either side so the transcripts sit at
// different offsets inside the gene span.
const GENOME = `TTTTATGAAATAAGGGGATGTGCTGATTTT`

function transcript(id: string, start: number, end: number) {
  return new SimpleFeature({
    uniqueId: id,
    refName: 'chr1',
    start,
    end,
    strand: 1,
    type: 'mRNA',
    subfeatures: [{ type: 'CDS', refName: 'chr1', start, end, phase: 0 }],
  })
}

describe('translateTranscripts', () => {
  it('fetches the gene span once and slices it per transcript', async () => {
    const spans: { start: number; end: number }[] = []
    const results = await translateTranscripts({
      transcripts: [transcript('a', 4, 13), transcript('b', 17, 26)],
      fetchSpan: async span => {
        spans.push({ start: span.start, end: span.end })
        return { seq: GENOME.slice(span.start, span.end) }
      },
    })

    expect(spans).toEqual([{ start: 4, end: 26 }])
    expect(results.map(r => r.seq)).toEqual(['MK*', 'MC*'])
  })

  it('reports the transcripts it could not translate without losing the rest', async () => {
    const broken = new SimpleFeature({
      uniqueId: 'broken',
      refName: 'chr1',
      start: 4,
      end: 13,
      strand: 1,
      type: 'mRNA',
    })
    const results = await translateTranscripts({
      transcripts: [transcript('a', 4, 13), broken],
      fetchSpan: async span => ({ seq: GENOME.slice(span.start, span.end) }),
    })

    expect(results[0]?.seq).toBe('MK*')
    expect(results[1]?.seq).toBe('')
  })

  it('leaves every transcript untranslated when the span comes back empty', async () => {
    const results = await translateTranscripts({
      transcripts: [transcript('a', 4, 13)],
      fetchSpan: async () => ({ seq: undefined }),
    })
    expect(results).toEqual([{ feature: expect.anything() }])
  })
})
