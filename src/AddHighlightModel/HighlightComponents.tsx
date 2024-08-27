import React from 'react'
import { observer } from 'mobx-react'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// locals
import ProteinToGenomeClickHighlight from './ProteinToGenomeClickHighlight'
import ProteinToGenomeHoverHighlight from './ProteinToGenomeHoverHighlight'
import GenomeMouseoverHighlight from './GenomeMouseoverHighlight'

const HighlightComponents = observer(function Highlight({
  model,
}: {
  model: LinearGenomeViewModel
}) {
  return (
    <>
      <ProteinToGenomeClickHighlight model={model} />
      <ProteinToGenomeHoverHighlight model={model} />
      <GenomeMouseoverHighlight model={model} />
    </>
  )
})

export default HighlightComponents
