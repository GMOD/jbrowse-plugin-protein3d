import { expect, test, vi } from 'vitest'

import stateModelFactory from './model'
import { removeMolstarStructure } from './removeStructure'

import type * as JBrowseCoreUtil from '@jbrowse/core/util'

vi.mock('@jbrowse/core/util', async importActual => {
  const actual = await importActual<typeof JBrowseCoreUtil>()
  return { ...actual, getSession: () => ({ hovered: undefined, views: [] }) }
})

const ProteinView = stateModelFactory()

function makeView() {
  return ProteinView.create({
    type: 'ProteinView',
    structures: [{ url: 'a.cif' }, { url: 'b.cif' }],
  })
}

test('removing a structure leaves the others as they were', () => {
  const view = makeView()
  const [first, second] = view.structures
  second!.setClickedStructureRange({ start: 3, end: 7 })

  view.removeStructure(first!)
  expect(view.structures.length).toBe(1)
  expect(view.structures[0]!.url).toBe('b.cif')
  expect(view.structures[0]!.clickedStructureRange).toEqual({
    start: 3,
    end: 7,
  })
  // the pivot a superposition aligned against is gone, so the rest re-align
  expect(view.superposedCount).toBe(0)
})

// Removing the structure node alone would leave the download, trajectory and
// model behind, and an ensemble's other models with them.
test('a removal takes out the trajectory the structure came from', async () => {
  const trajectory = { kind: 'trajectory' }
  const structureRef = { kind: 'structure', model: { trajectory } }
  const removed: unknown[] = []
  await removeMolstarStructure({
    plugin: {
      managers: {
        structure: {
          hierarchy: {
            findStructure: () => structureRef,
            remove: (refs: unknown[]) => {
              removed.push(...refs)
              return undefined
            },
          },
        },
      },
    },
    molstarStructure: undefined,
  })
  expect(removed).toEqual([trajectory])
})

// A view-wide banner reading "Failed to fetch" names neither which structure
// nor what it was fetching, and a structure stuck at loading never settles.
test('a failed structure reports on its own line and stops being pending', () => {
  const view = makeView()
  const [first, second] = view.structures
  first!.setLoadError(new Error('HTTP 404 fetching a.cif'))

  expect(first!.statusMessage).toBe('HTTP 404 fetching a.cif')
  expect(first!.loading).toBe(false)
  expect(second!.statusMessage).toBeUndefined()
  expect(view.error).toBeUndefined()
})

test('clearing the selection puts every structure down', () => {
  const view = makeView()
  for (const structure of view.structures) {
    structure.setClickedStructureRange({ start: 1, end: 2 })
    structure.setSelectedFeatureId('feature-1')
  }

  view.clearSelection()
  for (const structure of view.structures) {
    expect(structure.clickedStructureRange).toBeUndefined()
    expect(structure.selectedFeatureId).toBeUndefined()
  }
})
