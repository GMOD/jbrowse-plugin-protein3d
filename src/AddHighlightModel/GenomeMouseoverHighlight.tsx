import React from 'react'
import { observer } from 'mobx-react'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'
import { getSession } from '@jbrowse/core/util'
// locals
import Highlight from './Highlight'
import { checkHovered } from '../ProteinView/util'

const GenomeMouseoverHighlight = observer(function ({
  model,
}: {
  model: LinearGenomeViewModel
}) {
  const session = getSession(model)
  const { views, hovered } = session
  if (checkHovered(hovered) && views.some(s => s.type === 'ProteinView')) {
    const { assemblyNames } = model
    const { coord, refName } = hovered.hoverPosition
    return (
      <Highlight
        model={model}
        start={coord - 1}
        end={coord}
        refName={refName}
        assemblyName={assemblyNames[0]!}
      />
    )
  }
  return null
})

export default GenomeMouseoverHighlight
