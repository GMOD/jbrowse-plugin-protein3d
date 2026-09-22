import React from 'react'

import { getSession } from '@jbrowse/core/util'
import { observer } from 'mobx-react'

import Highlight from './Highlight'
import {
  findProteinLinkedView,
  genomeHighlightsForProteinPosition,
  getProteinLinkage,
} from '../Protein1DLinkage'
import { checkHovered } from '../ProteinView/util'

import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// A hover on a 1D protein-annotation view names the UniProt entry as its
// refName; this paints the codon on the genome view that 1D view was launched
// from.
const Protein1DToGenomeHoverHighlight = observer(
  function Protein1DToGenomeHoverHighlight({
    model,
  }: {
    model: LinearGenomeViewModel
  }) {
    const session = getSession(model)
    const { hovered } = session
    const { assemblyNames, id: viewId } = model

    if (!checkHovered(hovered)) {
      return null
    }

    const { coord, refName } = hovered.hoverPosition
    const linkage = getProteinLinkage(findProteinLinkedView(session, refName))
    const assemblyName = assemblyNames[0]
    if (linkage?.connectedViewId !== viewId || !assemblyName) {
      return null
    }

    return (
      <>
        {genomeHighlightsForProteinPosition(linkage, coord - 1).map(r => (
          <Highlight
            key={r.start}
            model={model}
            region={{ ...r, assemblyName }}
          />
        ))}
      </>
    )
  },
)

export default Protein1DToGenomeHoverHighlight
