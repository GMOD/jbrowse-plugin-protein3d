import React, { useEffect } from 'react'
import { observer } from 'mobx-react'
import { ErrorMessage } from '@jbrowse/core/ui'

// locals

import { JBrowsePluginProteinViewModel } from '../model'
import ProteinViewHeader from './ProteinViewHeader'

// hooks
import useProteinView from '../useProteinView'
import useProteinViewClickBehavior from '../useProteinViewClickBehavior'
import useProteinViewHoverBehavior from '../useProteinViewHoverBehavior'
import selectResidue from '../selectResidue'
import pairwiseSeqMap from '../../pairwiseSeqMap'
import css from '../css/molstar'
import highlightResidue from '../highlightResidue'

if (document?.head) {
  const style = document.createElement('style')
  style.append(css)
  document.head?.append(style)
}

const ProteinView = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const {
    width,
    height,
    url,
    showControls,
    pairwiseSeqMap,
    seq2,
    alignment,
    mouseCol2,
  } = model
  const { plugin, seq, parentRef, error } = useProteinView({
    url,
    showControls,
  })
  const { error: error2 } = useProteinViewClickBehavior({ plugin, model })
  useProteinViewHoverBehavior({ plugin, model })

  const structure =
    plugin?.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data

  useEffect(() => {
    model.setSeqs(seq, seq2)
  }, [seq, model, seq2])

  useEffect(() => {
    if (!plugin || !pairwiseSeqMap || !structure) {
      return
    }
    for (const coord of Object.keys(pairwiseSeqMap.coord1)) {
      selectResidue({
        structure,
        plugin,
        selectedResidue: +coord + 1,
      })
    }
  }, [plugin, structure, pairwiseSeqMap])

  useEffect(() => {
    if (!plugin || !structure || mouseCol2 === undefined || !pairwiseSeqMap) {
      return
    }
    const c0 = pairwiseSeqMap.coord2[mouseCol2]
    console.log({ pairwiseSeqMap, mouseCol2, c0 })
    if (c0 !== undefined) {
      highlightResidue({
        structure,
        plugin,
        selectedResidue: c0 + 1,
      })
    } else {
      console.warn('not found')
    }
  }, [plugin, structure, mouseCol2, pairwiseSeqMap])

  return error ? (
    <ErrorMessage error={error} />
  ) : (
    <div>
      {error2 ? <ErrorMessage error={error2} /> : null}
      <ProteinViewHeader model={model} />
      <div
        ref={parentRef}
        style={{
          position: 'relative',
          width,
          height,
        }}
      />
    </div>
  )
})

export default ProteinView
