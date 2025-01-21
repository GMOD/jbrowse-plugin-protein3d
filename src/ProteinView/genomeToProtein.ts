import { getSession } from '@jbrowse/core/util'

import { JBrowsePluginProteinStructureModel } from './model'
import { checkHovered } from './util'

export function genomeToProtein({
  model,
}: {
  model: JBrowsePluginProteinStructureModel
}): number | undefined {
  const { hovered } = getSession(model)
  const { genomeToTranscriptSeqMapping, connectedView } = model
  return !connectedView?.initialized ||
    !genomeToTranscriptSeqMapping ||
    !checkHovered(hovered)
    ? undefined
    : genomeToTranscriptSeqMapping.g2p[hovered.hoverPosition.coord]
}
