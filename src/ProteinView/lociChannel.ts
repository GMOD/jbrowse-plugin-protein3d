import { setMolstarLoci } from './applyLociInteractivity'

import type { Structure } from 'molstar/lib/mol-model/structure'
import type { PluginContext } from 'molstar/lib/mol-plugin/context'

interface ChannelStructure {
  readonly molstarStructure: Structure | undefined
  readonly mappedEntity: { entityId: string } | undefined
  readonly selectLabelSeqIds: number[]
  readonly hoverLabelSeqIds: number[]
}

export interface LociChannelHost {
  readonly molstarPluginContext: PluginContext | undefined
  readonly structures: readonly ChannelStructure[]
}

/**
 * Builds the body of the autorun that keeps one Mol* interactivity channel
 * lit on what every structure of the view wants: the click/declarative
 * selection for `select`, the hover for `highlight`. A declarative
 * initialSelection lights the structure the same way a click does because both
 * only set the model state this reads.
 *
 * One autorun per view rather than per structure, because the channel is
 * plugin-wide (see setMolstarLoci). Its observable reads all happen before
 * setMolstarLoci's first await, so MobX tracks every one of them.
 */
export function makeLociChannel(
  host: LociChannelHost,
  channel: 'select' | 'highlight',
) {
  return function applyLociChannel() {
    const plugin = host.molstarPluginContext
    const targets = host.structures.flatMap(s =>
      s.molstarStructure
        ? [
            {
              structure: s.molstarStructure,
              entityId: s.mappedEntity?.entityId,
              labelSeqIds:
                channel === 'select' ? s.selectLabelSeqIds : s.hoverLabelSeqIds,
            },
          ]
        : [],
    )
    if (plugin) {
      setMolstarLoci({ plugin, channel, targets }).catch((e: unknown) => {
        console.error(e)
      })
    }
  }
}
