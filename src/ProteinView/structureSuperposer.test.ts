import { types } from '@jbrowse/mobx-state-tree'
import { autorun } from 'mobx'
import { beforeEach, expect, test, vi } from 'vitest'

import { parseStructure } from '../test_data/molstarStructure'
import {
  makeStructureSuperposer,
  structuresSuperposed,
} from './structureSuperposer'
import { superposeStructures } from './superposeStructures'

import type {
  StructureSuperposerHost,
  SuperpositionKey,
} from './structureSuperposer'
import type { SuperpositionOutcome } from './superpositionOutcome'
import type { Structure } from 'molstar/lib/mol-model/structure'

vi.mock('./superposeStructures', () => ({ superposeStructures: vi.fn() }))
const mockSuperpose = vi.mocked(superposeStructures)

// Minimal stand-ins matching only the surface makeStructureSuperposer touches.
const TestStructure = types
  .model('TestStructure', {})
  .volatile(() => ({
    label: 'test',
    loadedToMolstar: false,
    molstarStructures: new Array<Structure>(),
    loading: false,
    alignment: undefined as object | undefined,
    mappedEntity: undefined as
      | { entityId: string; seq: string; seqIds: number[] }
      | undefined,
    coordinateMapper: undefined as
      | {
          maps: { structureSeqToTranscriptSeqPosition: Record<number, number> }
        }
      | undefined,
    chains: undefined as string[] | undefined,
    superposition: undefined as SuperpositionOutcome | undefined,
  }))
  .actions(self => ({
    setLoadedToMolstar(v: boolean, molstarStructures: Structure[] = []) {
      self.loadedToMolstar = v
      self.molstarStructures = molstarStructures
    },
    setLoading(loading: boolean) {
      self.loading = loading
    },
    setMapping(
      entityId: string,
      seqIds: number[],
      structureSeqToTranscriptSeqPosition: Record<number, number>,
    ) {
      self.mappedEntity = { entityId, seq: 'MKV', seqIds }
      self.coordinateMapper = { maps: { structureSeqToTranscriptSeqPosition } }
      self.alignment = {}
    },
    trimFusionPartner(
      structureSeqToTranscriptSeqPosition: Record<number, number>,
    ) {
      self.coordinateMapper = { maps: { structureSeqToTranscriptSeqPosition } }
      self.alignment = {}
    },
    setSuperposition(outcome: SuperpositionOutcome | undefined) {
      self.superposition = outcome
    },
  }))

const TestHost = types
  .model('TestHost', { structures: types.array(TestStructure) })
  .volatile(() => ({
    molstarPluginContext: undefined as object | undefined,
    superposedKeys: [] as readonly SuperpositionKey[],
    superposing: false,
    errors: [] as unknown[],
  }))
  .views(self => ({
    get superposedCount() {
      return self.superposedKeys.length
    },
  }))
  .actions(self => ({
    setPlugin(p?: object) {
      self.molstarPluginContext = p
    },
    setSuperposedKeys(keys: readonly SuperpositionKey[]) {
      self.superposedKeys = keys
    },
    setSuperposing(superposing: boolean) {
      self.superposing = superposing
    },
    addNotice(e: unknown) {
      self.errors.push(e)
    },
  }))

function setup(plugin: object, loadedCount: number) {
  const host = TestHost.create({ structures: [{}, {}, {}] })
  host.setPlugin(plugin)
  for (let i = 0; i < loadedCount; i++) {
    host.structures[i]!.setLoadedToMolstar(true)
  }
  const run = makeStructureSuperposer(
    host as unknown as StructureSuperposerHost,
  )
  return { host, run }
}

const chain = { asym: 'A', entity: '1', residues: ['MET', 'LYS', 'ALA'] }

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0))

beforeEach(() => {
  mockSuperpose.mockReset()
  mockSuperpose.mockResolvedValue([])
})

test('superposes once two structures are loaded', () => {
  const { run } = setup({}, 2)
  run()
  expect(mockSuperpose).toHaveBeenCalledTimes(1)
})

test('does not superpose with fewer than two loaded', () => {
  const { run } = setup({}, 1)
  run()
  expect(mockSuperpose).not.toHaveBeenCalled()
})

test('does not re-superpose when the loaded count is unchanged', async () => {
  const { run } = setup({}, 2)
  run()
  await tick()
  run()
  expect(mockSuperpose).toHaveBeenCalledTimes(1)
})

test('re-superposes when another structure loads', async () => {
  const { host, run } = setup({}, 2)
  run()
  await tick()
  host.structures[2]!.setLoadedToMolstar(true)
  run()
  expect(mockSuperpose).toHaveBeenCalledTimes(2)
})

test('does not start a second run while one is in flight', () => {
  mockSuperpose.mockReturnValue(new Promise(() => {}))
  const { host, run } = setup({}, 2)
  run()
  host.structures[2]!.setLoadedToMolstar(true)
  run()
  expect(mockSuperpose).toHaveBeenCalledTimes(1)
})

test('re-superposes after the plugin is swapped', async () => {
  const { host, run } = setup({ id: 'A' }, 2)
  run()
  await tick()
  host.setPlugin({ id: 'B' })
  run()
  expect(mockSuperpose).toHaveBeenCalledTimes(2)
})

test('reports superposition errors', async () => {
  const err = new Error('boom')
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
  mockSuperpose.mockRejectedValue(err)
  const { host, run } = setup({}, 2)
  run()
  await tick()
  expect(host.errors).toContain(err)
  expect(logged).toHaveBeenCalledWith(err)
  logged.mockRestore()
})

test('a failure from a plugin swapped away mid-run is not reported', async () => {
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
  mockSuperpose.mockRejectedValueOnce(new Error('plugin disposed'))
  const { host, run } = setup({}, 2)
  run()
  host.setPlugin({})
  await tick()
  expect(host.errors).toEqual([])
  logged.mockRestore()
})

// The view's structures, each with every model of its load, in view order: the
// first is the pivot. Reading Mol*'s own list instead aligned each model of an
// NMR ensemble on its own.
test('superposes the loaded structures of the view, each with all its models', async () => {
  const [model1, model2, single] = await Promise.all([
    parseStructure([chain]),
    parseStructure([chain]),
    parseStructure([chain]),
  ])
  const host = TestHost.create({ structures: [{}, {}, {}] })
  host.setPlugin({})
  host.structures[0]!.setLoadedToMolstar(true, [model1, model2])
  host.structures[2]!.setLoadedToMolstar(true, [single])
  makeStructureSuperposer(host as unknown as StructureSuperposerHost)()
  expect(mockSuperpose).toHaveBeenCalledWith({}, [
    { label: 'test', structures: [model1, model2], mapping: undefined },
    { label: 'test', structures: [single], mapping: undefined },
  ])
})

// Re-align resets the count while a run that started earlier is in flight: the
// run must neither overwrite the reset nor leave the autorun deaf to it.
function blockNextSuperpose() {
  let finish = () => {}
  mockSuperpose.mockReturnValueOnce(
    new Promise(resolve => {
      finish = () => {
        resolve([])
      }
    }),
  )
  return () => {
    finish()
  }
}

test('a reset during a run is not overwritten by the run finishing', async () => {
  const { host, run } = setup({}, 2)
  const dispose = autorun(run)
  await tick()
  expect(host.superposedCount).toBe(2)
  const finish = blockNextSuperpose()
  host.structures[2]!.setLoadedToMolstar(true)
  host.setSuperposedKeys([])
  finish()
  await tick()
  await tick()
  expect(mockSuperpose).toHaveBeenCalledTimes(3)
  expect(host.superposedCount).toBe(3)
  dispose()
})

test('a structure swapped for another during a run is superposed too', async () => {
  const finish = blockNextSuperpose()
  const { host, run } = setup({}, 2)
  const dispose = autorun(run)
  host.structures[1]!.setLoadedToMolstar(false)
  host.structures[2]!.setLoadedToMolstar(true)
  finish()
  await tick()
  await tick()
  expect(mockSuperpose).toHaveBeenCalledTimes(2)
  dispose()
})

// the chain a structure aligns by and the residues that pair come from its
// alignment, so moving it before that would move it twice
test('waits for every loaded structure to be aligned', () => {
  const { host, run } = setup({}, 2)
  host.structures[1]!.setLoading(true)
  run()
  expect(mockSuperpose).not.toHaveBeenCalled()
  host.structures[1]!.setLoading(false)
  run()
  expect(mockSuperpose).toHaveBeenCalledTimes(1)
})

// SIFTS unmaps a fusion partner's residues from the alignment the mapper is
// built from, and a run before it paired the partner's chance residues
test('re-superposes on the pairs SIFTS leaves once it trims a fusion partner', async () => {
  const { host, run } = setup({}, 2)
  host.structures[1]!.setMapping('1', [1, 2, 3], { 0: 0, 1: 1, 2: 2 })
  const dispose = autorun(run)
  await tick()
  host.structures[1]!.trimFusionPartner({ 0: 0 })
  await tick()
  expect(mockSuperpose).toHaveBeenCalledTimes(2)
  expect(mockSuperpose.mock.calls[1]?.[1][1]?.mapping?.residues).toEqual(
    new Map([[1, { transcript: 0, code: 'M' }]]),
  )
  dispose()
})

test('hands over the mapped chain, its residues by label_seq_id', () => {
  const { host, run } = setup({}, 2)
  host.structures[1]!.setMapping('2', [5, 6, 7], { 0: 10, 2: 12 })
  run()
  expect(mockSuperpose.mock.calls[0]?.[1][1]?.mapping).toEqual({
    entityId: '2',
    residues: new Map([
      [5, { transcript: 10, code: 'M' }],
      [7, { transcript: 12, code: 'V' }],
    ]),
    drawnChains: undefined,
  })
})

test('re-superposes when the chain picker maps another chain', async () => {
  const { host, run } = setup({}, 2)
  const dispose = autorun(run)
  await tick()
  host.structures[1]!.setMapping('2', [1], { 0: 0 })
  await tick()
  expect(mockSuperpose).toHaveBeenCalledTimes(2)
  dispose()
})

// the run a chain pick starts ends in a camera reset, so whatever frames the
// camera has to wait for it, though the count of loads never moved
test('a re-superposition still running reads as not superposed', async () => {
  const { host, run } = setup({}, 2)
  const dispose = autorun(run)
  await tick()
  expect(structuresSuperposed(host)).toBe(true)
  const finish = blockNextSuperpose()
  host.structures[1]!.setMapping('2', [1], { 0: 0 })
  expect(host.superposedCount).toBe(2)
  expect(structuresSuperposed(host)).toBe(false)
  finish()
  await tick()
  expect(structuresSuperposed(host)).toBe(true)
  dispose()
})

// the count the swap leaves behind equals the count loaded
test('a structure swapped in during a run reads as not superposed until a run covers it', async () => {
  const finishFirst = blockNextSuperpose()
  const finishSecond = blockNextSuperpose()
  const { host, run } = setup({}, 2)
  const dispose = autorun(run)
  host.structures[1]!.setLoadedToMolstar(false)
  host.structures[2]!.setLoadedToMolstar(true)
  finishFirst()
  await tick()
  expect(mockSuperpose).toHaveBeenCalledTimes(2)
  expect(host.superposedCount).toBe(2)
  expect(structuresSuperposed(host)).toBe(false)
  finishSecond()
  await tick()
  expect(structuresSuperposed(host)).toBe(true)
  dispose()
})

// the run still ends in a camera reset, which undid a framing of the one left
test('a removal that leaves one structure mid-run reads as superposed once the run ends', async () => {
  const finish = blockNextSuperpose()
  const { host, run } = setup({}, 2)
  const dispose = autorun(run)
  host.structures[1]!.setLoadedToMolstar(false)
  expect(structuresSuperposed(host)).toBe(false)
  finish()
  await tick()
  expect(structuresSuperposed(host)).toBe(true)
  dispose()
})

// a run into a torn-down plugin may never end, and must not hold a view of
// one structure in the new plugin back
test('a plugin swapped in mid-run is not held back by the old run', () => {
  blockNextSuperpose()
  const { host, run } = setup({ id: 'A' }, 2)
  const dispose = autorun(run)
  expect(host.superposing).toBe(true)
  host.structures[1]!.setLoadedToMolstar(false)
  host.setPlugin({ id: 'B' })
  expect(structuresSuperposed(host)).toBe(true)
  dispose()
})

test('each structure keeps its outcome until it is the only one', async () => {
  const outcome = {
    method: 'unmoved',
    structure: { label: 'b' },
    pivot: { label: 'a' },
    reason: { kind: 'dissimilar', tmScore: 0.2 },
    pairs: { count: 0, identity: 0 },
  } satisfies SuperpositionOutcome
  mockSuperpose.mockResolvedValue([undefined, outcome])
  const { host, run } = setup({}, 2)
  const dispose = autorun(run)
  await tick()
  expect(host.structures[1]!.superposition).toEqual(outcome)
  host.structures[0]!.setLoadedToMolstar(false)
  expect(host.structures[1]!.superposition).toBeUndefined()
  dispose()
})
