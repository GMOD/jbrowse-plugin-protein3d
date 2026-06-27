import { expect, test } from 'vitest'

import { diagnose } from './diagnostics'

import type { EntityInfo, LoadedStructure } from './molstar'

function entity(p: Partial<EntityInfo> & { index: number; seq: string }): EntityInfo {
  return {
    entityId: String(p.index),
    description: `entity ${p.index}`,
    chains: ['A'],
    seqLength: p.seq.length,
    observedCount: p.seq.length,
    ...p,
  }
}

const ACE2 = 'STIEEQAKTFLDKFNHEAEDLFYQSSLASWNYNTNITEENVQNMNNAGDKWSAFLKEQST'
const RBD = 'RVQPTESIVRFPNITNLCPFGEVFNATRFASVYAWNRKRISNCVADYSVLYNSASFSTFK'

test('WRONG_CHAIN fires when the transcript matches entity [1], not [0]', () => {
  const loaded: LoadedStructure = {
    entities: [entity({ index: 0, seq: RBD }), entity({ index: 1, seq: ACE2 })],
    ligands: [],
  }
  const d = diagnose({ loaded, transcript: ACE2, algorithm: 'smith_waterman', isAlphaFold: false })
  expect(d.bestIndex).toBe(1)
  expect(d.usedIndex).toBe(0)
  expect(d.verdicts.map(v => v.code)).toContain('WRONG_CHAIN')
})

test('DISORDER_DRIFT fires when entity [0] has unmodeled residues', () => {
  const loaded: LoadedStructure = {
    entities: [entity({ index: 0, seq: ACE2, observedCount: ACE2.length - 12 })],
    ligands: [],
  }
  const d = diagnose({ loaded, transcript: ACE2, algorithm: 'smith_waterman', isAlphaFold: false })
  expect(d.verdicts.map(v => v.code)).toContain('DISORDER_DRIFT')
})

test('clean single fully-modeled entity reports CLEAN', () => {
  const loaded: LoadedStructure = {
    entities: [entity({ index: 0, seq: ACE2 })],
    ligands: [],
  }
  const d = diagnose({ loaded, transcript: ACE2, algorithm: 'smith_waterman', isAlphaFold: false })
  expect(d.verdicts.map(v => v.code)).toEqual(['CLEAN'])
})

test('AF_FRAGMENT fires when an AlphaFold structure is shorter than the transcript', () => {
  const loaded: LoadedStructure = {
    entities: [entity({ index: 0, seq: ACE2 })], // 59aa "F1"
    ligands: [],
  }
  const longTranscript = ACE2.repeat(3) // transcript far longer than loaded structure
  const d = diagnose({ loaded, transcript: longTranscript, algorithm: 'smith_waterman', isAlphaFold: true })
  expect(d.verdicts.map(v => v.code)).toContain('AF_FRAGMENT')
})

test('full-length AlphaFold (structure == transcript) does NOT report AF_FRAGMENT', () => {
  const loaded: LoadedStructure = {
    entities: [entity({ index: 0, seq: ACE2 })],
    ligands: [],
  }
  const d = diagnose({ loaded, transcript: ACE2, algorithm: 'smith_waterman', isAlphaFold: true })
  expect(d.verdicts.map(v => v.code)).not.toContain('AF_FRAGMENT')
})
