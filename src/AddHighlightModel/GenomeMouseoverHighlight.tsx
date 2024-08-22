import React from 'react'
import { observer } from 'mobx-react'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'
import { getSession } from '@jbrowse/core/util'
// locals
import Highlight from './Highlight'

const GenomeMouseoverHighlight = observer(function ({
  model,
}: {
  model: LinearGenomeViewModel
}) {
  const { hovered } = getSession(model)
  return hovered &&
    typeof hovered === 'object' &&
    'hoverPosition' in hovered ? (
    <HoverHighlight model={model} />
  ) : null
})

const HoverHighlight = observer(function ({
  model,
}: {
  model: LinearGenomeViewModel
}) {
  const session = getSession(model)
  if (session.views.some(s => s.type === 'ProteinView')) {
    const { hovered } = session
    const { assemblyNames } = model
    // @ts-expect-error
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
