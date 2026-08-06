import { expect, test } from 'vitest'

import { diagnose } from './diagnostics'

import type { EntityInfo, LoadedStructure } from './molstar'

function entity(
  p: Partial<EntityInfo> & { index: number; seq: string },
): EntityInfo {
  return {
    entityId: String(p.index),
    description: `entity ${p.index}`,
    chains: ['A'],
    seqLength: p.seq.length,
    seqIds: Array.from(p.seq, (_, i) => i + 1),
    observedCount: p.seq.length,
    ...p,
  }
}

const ACE2 = 'STIEEQAKTFLDKFNHEAEDLFYQSSLASWNYNTNITEENVQNMNNAGDKWSAFLKEQST'
const RBD = 'RVQPTESIVRFPNITNLCPFGEVFNATRFASVYAWNRKRISNCVADYSVLYNSASFSTFK'

// This test used to assert usedIndex === 0 and WRONG_CHAIN, which was faithful
// while the plugin hardcoded entity [0]. The harness now runs the plugin's real
// chooseMappedEntity, so the same input demonstrates the fix instead of the bug
// — and WRONG_CHAIN became a regression alarm that should never fire here.
test('the transcript resolves to entity [1], not [0]', () => {
  const loaded: LoadedStructure = {
    entities: [entity({ index: 0, seq: RBD }), entity({ index: 1, seq: ACE2 })],
    ligands: [],
  }
  const d = diagnose({
    loaded,
    transcript: ACE2,
    algorithm: 'smith_waterman',
    isAlphaFold: false,
  })
  expect(d.bestIndex).toBe(1)
  expect(d.usedIndex).toBe(1)
  const codes = d.verdicts.map(v => v.code)
  expect(codes).toContain('RESOLVED_CHAIN')
  expect(codes).toContain('MULTI_ENTITY')
  expect(codes).not.toContain('WRONG_CHAIN')
})

test('AUTHOR_NUMBERING fires when label_seq_ids do not start at 1', () => {
  const loaded: LoadedStructure = {
    entities: [
      entity({
        index: 0,
        seq: ACE2,
        seqIds: Array.from(ACE2, (_, i) => i + 94),
      }),
    ],
    ligands: [],
  }
  const d = diagnose({
    loaded,
    transcript: ACE2,
    algorithm: 'smith_waterman',
    isAlphaFold: false,
  })
  const numbering = d.verdicts.find(v => v.code === 'AUTHOR_NUMBERING')
  expect(numbering).toBeDefined()
  expect(numbering!.message).toContain('off by 93')
})

test('AUTHOR_NUMBERING does not fire for ordinary 1..N numbering', () => {
  const loaded: LoadedStructure = {
    entities: [entity({ index: 0, seq: ACE2 })],
    ligands: [],
  }
  const d = diagnose({
    loaded,
    transcript: ACE2,
    algorithm: 'smith_waterman',
    isAlphaFold: false,
  })
  expect(d.verdicts.map(v => v.code)).not.toContain('AUTHOR_NUMBERING')
})

test('DISORDER_DRIFT fires when the mapped entity has unmodeled residues', () => {
  const loaded: LoadedStructure = {
    entities: [
      entity({ index: 0, seq: ACE2, observedCount: ACE2.length - 12 }),
    ],
    ligands: [],
  }
  const d = diagnose({
    loaded,
    transcript: ACE2,
    algorithm: 'smith_waterman',
    isAlphaFold: false,
  })
  expect(d.verdicts.map(v => v.code)).toContain('DISORDER_DRIFT')
})

test('clean single fully-modeled entity reports CLEAN', () => {
  const loaded: LoadedStructure = {
    entities: [entity({ index: 0, seq: ACE2 })],
    ligands: [],
  }
  const d = diagnose({
    loaded,
    transcript: ACE2,
    algorithm: 'smith_waterman',
    isAlphaFold: false,
  })
  expect(d.verdicts.map(v => v.code)).toEqual(['CLEAN'])
})

test('AF_FRAGMENT fires when an AlphaFold structure is shorter than the transcript', () => {
  const loaded: LoadedStructure = {
    entities: [entity({ index: 0, seq: ACE2 })], // 59aa "F1"
    ligands: [],
  }
  const longTranscript = ACE2.repeat(3) // transcript far longer than loaded structure
  const d = diagnose({
    loaded,
    transcript: longTranscript,
    algorithm: 'smith_waterman',
    isAlphaFold: true,
  })
  expect(d.verdicts.map(v => v.code)).toContain('AF_FRAGMENT')
})

test('full-length AlphaFold (structure == transcript) does NOT report AF_FRAGMENT', () => {
  const loaded: LoadedStructure = {
    entities: [entity({ index: 0, seq: ACE2 })],
    ligands: [],
  }
  const d = diagnose({
    loaded,
    transcript: ACE2,
    algorithm: 'smith_waterman',
    isAlphaFold: true,
  })
  expect(d.verdicts.map(v => v.code)).not.toContain('AF_FRAGMENT')
})
