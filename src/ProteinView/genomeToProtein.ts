import { getSession } from '@jbrowse/core/util'
import { checkHovered } from './util'
import { JBrowsePluginProteinViewModel } from './model'

export function genomeToProtein({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}): number | undefined {
  const { hovered } = getSession(model)
  const { genomeToTranscriptSeqMapping, connectedView } = model
  if (
    !connectedView?.initialized ||
    !genomeToTranscriptSeqMapping ||
    !checkHovered(hovered)
  ) {
    return undefined
  }

  return genomeToTranscriptSeqMapping.g2p[hovered.hoverPosition.coord]
}
