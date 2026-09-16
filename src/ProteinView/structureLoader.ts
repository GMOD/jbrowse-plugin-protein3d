import { isAlive } from '@jbrowse/mobx-state-tree'

import { loadStructureData } from './loadStructureData'
import {
  fetchAlphaFoldModels,
  pickAlphaFoldModel,
} from '../LaunchProteinView/services/alphaFoldModels'
import { getAlphaFoldStructureUrl } from '../LaunchProteinView/utils/structureUrls'

import type StructureModel from './structureModel'
import type { AlphaFoldModel } from '../LaunchProteinView/services/alphaFoldModels'
import type { IAnyStateTreeNode, Instance } from '@jbrowse/mobx-state-tree'
import type { PluginContext } from 'molstar/lib/mol-plugin/context'

type StructureInstance = Instance<typeof StructureModel>

export type AlphaFoldModelFetcher = (
  uniprotId: string,
) => Promise<AlphaFoldModel[]>

export type StructureLoaderHost = IAnyStateTreeNode & {
  readonly molstarPluginContext: PluginContext | undefined
  readonly structures: StructureInstance[]
  setError: (error: unknown) => void
}

/**
 * Builds the body of the autorun that loads structures into Molstar.
 *
 * The returned callback is synchronous on purpose: MobX only tracks
 * observables read before the first `await`, so an async autorun body would
 * stop reacting to later structures/plugin changes. Instead it reads its
 * dependencies synchronously and dispatches a guarded fire-and-forget load for
 * each structure that is neither loaded nor already loading. The guards handle
 * the lifecycle hazards of an external GPU resource:
 *
 *   - a non-observable in-flight Set stops a re-entrant run (a new structure
 *     pushed, or the plugin swapped mid-load) from starting a duplicate load of
 *     the same structure;
 *   - a load whose plugin was replaced or whose model was destroyed while
 *     awaiting has its result discarded rather than written into a torn-down
 *     plugin;
 *   - if the plugin was merely swapped (e.g. a view remount), the structure is
 *     reloaded into the current plugin so it isn't left stranded unloaded.
 */
export function makeStructureLoader(
  host: StructureLoaderHost,
  fetchModels: AlphaFoldModelFetcher = fetchAlphaFoldModels,
) {
  const loadingStructures = new Set<StructureInstance>()

  /** The accession a structure still has to turn into a file, if any. */
  function unresolvedAccession(structure: StructureInstance) {
    const { url, data, uniprotId } = structure
    return url === undefined && data === undefined ? uniprotId : undefined
  }

  /**
   * Which AlphaFold file an accession opens. Asked rather than spelled: a
   * protein folded past the length cap has no F1 fragment, and the model
   * version moves, so a hardcoded name 404s. The transcript's own translation
   * goes to the picker, so an isoform AlphaFold folded exactly maps as an
   * identity. A failed API leaves the guessed canonical filename, which is what
   * this opened before it asked at all.
   */
  async function resolveAlphaFoldUrl(
    structure: StructureInstance,
    uniprotId: string,
  ) {
    const picked = await fetchModels(uniprotId).then(
      models =>
        pickAlphaFoldModel(models, {
          transcript: { seq: structure.userProvidedTranscriptSequence },
        }),
      () => undefined,
    )
    if (isAlive(structure)) {
      structure.setUrl(picked?.url ?? getAlphaFoldStructureUrl(uniprotId))
    }
  }

  function loadInto(structure: StructureInstance, plugin: PluginContext) {
    loadingStructures.add(structure)
    // a structure that already knows its file dispatches synchronously, so the
    // in-flight guard covers it before the autorun body returns
    const accession = unresolvedAccession(structure)
    const loaded =
      accession === undefined
        ? loadStructureData({ structure, plugin })
        : resolveAlphaFoldUrl(structure, accession).then(() =>
            loadStructureData({ structure, plugin }),
          )
    loaded
      .then(data => {
        const current = isAlive(structure)
          ? host.molstarPluginContext
          : undefined
        if (current === plugin) {
          structure.setStructureData(data)
          structure.setLoadedToMolstar(true)
        }
        loadingStructures.delete(structure)
        if (current && current !== plugin && !structure.loadedToMolstar) {
          loadInto(structure, current)
        }
      })
      .catch((e: unknown) => {
        loadingStructures.delete(structure)
        if (!isAlive(host) || !isAlive(structure)) {
          return
        }
        const current = host.molstarPluginContext
        if (current && current !== plugin) {
          // a plugin torn down mid-load rejects too; the structure belongs in
          // the current one, not in an error
          loadInto(structure, current)
        } else {
          host.setError(e)
          console.error(e)
        }
      })
  }

  return function loadPendingStructures() {
    const { structures, molstarPluginContext } = host
    if (molstarPluginContext) {
      for (const structure of structures) {
        if (!structure.loadedToMolstar && !loadingStructures.has(structure)) {
          loadInto(structure, molstarPluginContext)
        }
      }
    }
  }
}
