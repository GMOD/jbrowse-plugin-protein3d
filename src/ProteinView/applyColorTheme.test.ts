// @vitest-environment jsdom
import { expect, test } from 'vitest'

import { COLOR_SCHEME_VALUES, applyColorTheme } from './applyColorTheme'
import { withTemporaryMolstarPlugin } from './withTemporaryMolstarPlugin'
import { loadCaOnly } from '../test_data/molstarPlugin'

import type { Structure } from 'molstar/lib/mol-model/structure'
import type { PluginContext } from 'molstar/lib/mol-plugin/context'

// what each call to updateRepresentationsTheme asked for, component by component
function makePlugin(structureComponents: string[]) {
  const calls: { component: string; theme: unknown }[][] = []
  const loaded = structureComponents.map(component => ({
    molstarStructure: {} as Structure,
    components: [component],
  }))
  const plugin = {
    managers: {
      structure: {
        hierarchy: {
          findStructure: (structure: Structure) =>
            loaded.find(l => l.molstarStructure === structure),
        },
        component: {
          updateRepresentationsTheme: (
            components: string[],
            themeOf: (c: string) => unknown,
          ) => {
            calls.push(
              components.map(c => ({ component: c, theme: themeOf(c) })),
            )
            return Promise.resolve()
          },
        },
      },
    },
  }
  return {
    plugin: plugin as unknown as PluginContext,
    structures: loaded.map(l => ({ molstarStructure: l.molstarStructure })),
    calls,
  }
}

test('exposes pLDDT among the color schemes', () => {
  expect(COLOR_SCHEME_VALUES).toContain('plddt-confidence')
  expect(COLOR_SCHEME_VALUES).toContain('default')
  // scheme values are unique (no duplicate menu entries)
  expect(new Set(COLOR_SCHEME_VALUES).size).toBe(COLOR_SCHEME_VALUES.length)
})

test('applies the chosen theme to every loaded structure in one update', async () => {
  const { plugin, structures, calls } = makePlugin(['compA', 'compB'])
  await applyColorTheme({
    plugin,
    colorScheme: 'plddt-confidence',
    structures,
  })
  expect(calls).toEqual([
    [
      { component: 'compA', theme: { color: 'plddt-confidence' } },
      { component: 'compB', theme: { color: 'plddt-confidence' } },
    ],
  ])
})

test('passes built-in theme names through unchanged', async () => {
  const { plugin, structures, calls } = makePlugin(['comp'])
  await applyColorTheme({ plugin, colorScheme: 'hydrophobicity', structures })
  expect(calls).toEqual([
    [{ component: 'comp', theme: { color: 'hydrophobicity' } }],
  ])
})

test("colors each structure's own mapped chain", async () => {
  const { plugin, structures, calls } = makePlugin(['compA', 'compB'])
  await applyColorTheme({
    plugin,
    colorScheme: 'mapped-chain',
    structures: [
      { ...structures[0]!, entityId: '1' },
      { ...structures[1]!, entityId: '3' },
    ],
  })
  expect(calls).toEqual([
    [
      {
        component: 'compA',
        theme: { color: 'mapped-chain', colorParams: { entityId: '1' } },
      },
      {
        component: 'compB',
        theme: { color: 'mapped-chain', colorParams: { entityId: '3' } },
      },
    ],
  ])
})

test('skips a structure molstar no longer holds', async () => {
  const { plugin, calls } = makePlugin(['comp'])
  await applyColorTheme({
    plugin,
    colorScheme: 'default',
    structures: [{ molstarStructure: {} as Structure }],
  })
  expect(calls).toEqual([])
})

test('no-op when no structures are loaded', async () => {
  const { plugin, structures, calls } = makePlugin([])
  await applyColorTheme({ plugin, colorScheme: 'default', structures })
  expect(calls).toEqual([])
})

// An NMR ensemble loads as one Mol* structure per model. Recoloring only the
// first left the other models on the preset's per-model colours, so on a
// 20-model entry a chosen scheme looked as if it had not applied.
test('recolors every model of an ensemble', async () => {
  await withTemporaryMolstarPlugin(async plugin => {
    const { structures } = await loadCaOnly(
      plugin,
      [{ asym: 'A', entity: '1', residues: ['MET', 'LYS', 'ALA'] }],
      { models: 4 },
    )
    await applyColorTheme({
      plugin,
      colorScheme: 'hydrophobicity',
      structures: structures.map(molstarStructure => ({ molstarStructure })),
    })
    const themes = plugin.managers.structure.hierarchy.current.structures
      .flatMap(s => s.components)
      .flatMap(c => c.representations)
      .map(r => r.cell.transform.params?.colorTheme.name)
    expect(themes).toHaveLength(4)
    expect(new Set(themes)).toEqual(new Set(['hydrophobicity']))
  })
})
