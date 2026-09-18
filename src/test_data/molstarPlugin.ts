import { caOnlyMmcif } from './molstarStructure'
import {
  applyStructurePreset,
  parseStructureTrajectory,
} from '../ProteinView/structurePipeline'

import type { TestChain } from './molstarStructure'
import type { PluginContext } from 'molstar/lib/mol-plugin/context'

/** Load a CA-only mmCIF into a headless plugin the way the view loads one.
 * Needs the jsdom environment: Mol*'s layout listens on `document`. */
export async function loadCaOnly(
  plugin: PluginContext,
  chains: TestChain[],
  options?: { models?: number },
) {
  const trajectory = await parseStructureTrajectory({
    plugin,
    data: caOnlyMmcif(chains, options),
  })
  return applyStructurePreset({ plugin, trajectory })
}
