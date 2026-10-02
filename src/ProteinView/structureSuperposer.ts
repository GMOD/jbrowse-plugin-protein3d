import { isAlive } from '@jbrowse/mobx-state-tree'

import { superposeStructures } from './superposeStructures'

import type { IAnyStateTreeNode } from '@jbrowse/mobx-state-tree'
import type { Structure } from 'molstar/lib/mol-model/structure'
import type { PluginContext } from 'molstar/lib/mol-plugin/context'

export type StructureSuperposerHost = IAnyStateTreeNode & {
  readonly molstarPluginContext: PluginContext | undefined
  readonly structures: readonly {
    readonly loadedToMolstar: boolean
    readonly molstarStructures: readonly Structure[]
  }[]
  /** How many loaded structures the last superposition covered; observable,
   * so the camera framing can wait for the reset that ends a superposition. */
  readonly superposedCount: number
  setSuperposedCount: (count: number) => void
  setError: (error: unknown) => void
}

/**
 * Builds the body of the autorun that keeps Molstar's structures superposed.
 *
 * Superposition is a pure function of which structures are loaded into the
 * current plugin, so it is modeled as a reaction rather than triggered
 * imperatively when a structure is added. That keeps a single loading path (the
 * structure loader). The body reads its observable dependencies synchronously
 * (MobX only tracks reads before the first `await`) and dispatches one guarded,
 * fire-and-forget run:
 *
 *   - a non-observable in-flight flag serializes runs so overlapping molstar
 *     state mutations can't interleave;
 *   - `superposedCount`/`superposedPlugin` remember the last alignment, so a run
 *     only happens when the loaded set grows or the plugin is swapped, not on
 *     every reaction;
 *   - after a run finishes it re-checks, because the loaded set may have grown
 *     (or the plugin been swapped) while it was aligning;
 *   - every observable is read before the in-flight check, so a reset that
 *     lands mid-run (Re-align, a removal) is still tracked, and the run leaves
 *     a reset count alone rather than overwriting it.
 */
export function makeStructureSuperposer(host: StructureSuperposerHost) {
  let superposing = false
  let superposedPlugin: PluginContext | undefined

  function run() {
    const { molstarPluginContext: plugin, structures } = host
    const loaded = structures.filter(s => s.loadedToMolstar)
    const loadedCount = loaded.length
    if (plugin !== superposedPlugin) {
      superposedPlugin = plugin
      host.setSuperposedCount(0)
    }
    const startCount = host.superposedCount
    if (
      plugin &&
      !superposing &&
      loadedCount >= 2 &&
      loadedCount !== startCount
    ) {
      superposing = true
      superposeStructures(
        plugin,
        loaded.map(s => s.molstarStructures),
      )
        .catch((e: unknown) => {
          if (isAlive(host)) {
            host.setError(e)
            console.error(e)
          }
        })
        .finally(() => {
          superposing = false
          if (isAlive(host)) {
            // a run into a plugin swapped away mid-flight covered nothing
            if (
              host.molstarPluginContext === plugin &&
              host.superposedCount === startCount
            ) {
              host.setSuperposedCount(loadedCount)
            }
            run()
          }
        })
    }
  }
  return run
}
