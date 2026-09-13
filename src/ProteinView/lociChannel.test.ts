import { autorun, observable, runInAction } from 'mobx'
import { expect, test, vi } from 'vitest'

import { makeLociChannel } from './lociChannel'

import type { Structure } from 'molstar/lib/mol-model/structure'
import type { PluginContext } from 'molstar/lib/mol-plugin/context'

// Each loci is tagged with the structure and residues it was built for, so the
// test reads back what the plugin was told to light.
vi.mock('./loadMolstar', () => ({
  default: async () => ({
    Script: {
      getStructureSelection: (_query: unknown, structure: { name: string }) =>
        structure.name,
    },
    StructureSelection: { toLociWithSourceUnits: (name: string) => name },
  }),
}))

function fakePlugin() {
  const lit: string[] = []
  const plugin = {
    managers: {
      interactivity: {
        lociSelects: {
          deselectAll: () => {
            lit.length = 0
          },
          select: ({ loci }: { loci: string }) => {
            lit.push(loci)
          },
        },
        lociHighlights: {
          clearHighlights: () => {
            lit.length = 0
          },
          highlight: ({ loci }: { loci: string }) => {
            lit.push(loci)
          },
        },
      },
    },
  } as unknown as PluginContext
  return { plugin, lit }
}

function structure(name: string, selectLabelSeqIds: number[] = []) {
  return observable({
    molstarStructure: { name } as unknown as Structure,
    mappedEntity: { entityId: '1' },
    selectLabelSeqIds,
    hoverLabelSeqIds: [] as number[],
  })
}

// The shape of a TP53 session opened on R248 with a mouse model superposed:
// the second structure selects nothing, and used to deselect the first's R248
// as it loaded.
test('a structure selecting nothing leaves another structure selection lit', async () => {
  const { plugin, lit } = fakePlugin()
  const human = structure('human', [248])
  const host = observable({
    molstarPluginContext: plugin,
    structures: [human],
  })
  const dispose = autorun(makeLociChannel(host, 'select'))
  await vi.waitFor(() => {
    expect(lit).toEqual(['human'])
  })

  runInAction(() => {
    host.structures.push(structure('mouse'))
  })
  await new Promise(r => setTimeout(r, 0))
  expect(lit).toEqual(['human'])

  runInAction(() => {
    human.selectLabelSeqIds = []
  })
  await vi.waitFor(() => {
    expect(lit).toEqual([])
  })
  dispose()
})

test('when updates overlap, the later one is what stays lit', async () => {
  const { plugin, lit } = fakePlugin()
  const human = structure('human', [1])
  const mouse = structure('mouse')
  const host = observable({
    molstarPluginContext: plugin,
    structures: [human, mouse],
  })
  const dispose = autorun(makeLociChannel(host, 'select'))
  runInAction(() => {
    human.selectLabelSeqIds = []
    mouse.selectLabelSeqIds = [2]
  })
  await new Promise(r => setTimeout(r, 0))
  expect(lit).toEqual(['mouse'])
  dispose()
})
