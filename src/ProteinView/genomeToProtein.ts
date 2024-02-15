import { getSession } from '@jbrowse/core/util'
import { checkHovered } from './util'
import { JBrowsePluginProteinViewModel } from './model'

export function genomeToProtein({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}): number | undefined {
  const { hovered } = getSession(model)
  const { genomeToTranscriptMapping, connectedView } = model
  if (
    !connectedView?.initialized ||
    !genomeToTranscriptMapping ||
    !checkHovered(hovered)
  ) {
    return undefined
  }

  return genomeToTranscriptMapping.g2p[hovered.hoverPosition.coord]
}
