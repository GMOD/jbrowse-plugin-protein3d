import React from 'react'
import { observer } from 'mobx-react'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// locals
import ProteinToGenomeHighlight from './ProteinToGenomeHighlight'
import GenomeMouseoverHighlight from './GenomeMouseoverHighlight'

type LGV = LinearGenomeViewModel

const HighlightComponents = observer(function Highlight({
  model,
}: {
  model: LGV
}) {
  return (
    <>
      <ProteinToGenomeHighlight model={model} />
      <GenomeMouseoverHighlight model={model} />
    </>
  )
})

export default HighlightComponents
