import { getSession } from '@jbrowse/core/util'
import { checkHovered } from './util'
import { JBrowsePluginProteinViewModel } from './model'

export function genomeToProtein({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}): number | undefined {
  const { hovered } = getSession(model)
  const { transcriptToProteinMap, connectedView } = model
  if (
    !connectedView?.initialized ||
    !transcriptToProteinMap ||
    !checkHovered(hovered)
  ) {
    return undefined
  }

  return transcriptToProteinMap.g2p[hovered.hoverPosition.coord]
}
