import React from 'react'

import { observer } from 'mobx-react'

import GenomeMouseoverHighlight from './GenomeMouseoverHighlight'
import ProteinToGenomeClickHighlight from './ProteinToGenomeClickHighlight'
import ProteinToGenomeHoverHighlight from './ProteinToGenomeHoverHighlight'

import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

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
