import { describe, expect, it } from 'vitest'

import { getLaunchMissingReasons } from './launchHelpers'

const ready = {
  userSelectedProteinSequence: { seq: 'MKT*' },
  selectedTranscript: { id: 'ENST1' },
}

describe('getLaunchMissingReasons', () => {
  it('needs nothing more once a translated transcript is chosen', () => {
    expect(getLaunchMissingReasons(ready)).toEqual([])
  })

  it('asks for the transcript and its translation', () => {
    expect(getLaunchMissingReasons({})).toEqual([
      'Could not compute protein sequence (feature may be missing CDS subfeatures)',
      'No transcript selected',
    ])
  })
})
