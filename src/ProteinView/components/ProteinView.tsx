import React, { useEffect } from 'react'
import { observer } from 'mobx-react'
import { ErrorMessage } from '@jbrowse/core/ui'

// locals

import { JBrowsePluginProteinViewModel } from '../model'
import ProteinViewHeader from './ProteinViewHeader'

// hooks
import useProteinView from './useProteinView'
import useProteinViewClickActionBehavior from './useProteinViewClickActionBehavior'
import selectResidue from './selectResidue'
import pairwiseSeqMap from '../../pairwiseSeqMap'

// note: css must be injected into the js code for jbrowse plugins
import css from './molstarCss'

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
  const { width, height, url, showControls, seq2, alignment } = model
  const { plugin, seq, parentRef, error } = useProteinView({
    url,
    showControls,
  })
  const { error: error2 } = useProteinViewClickActionBehavior({ plugin, model })

  const structureLoaded =
    !!plugin?.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data

  useEffect(() => {
    model.setSeqs(seq, seq2)
  }, [seq, model, seq2])

  useEffect(() => {
    if (!plugin || !alignment || !structureLoaded) {
      return
    }
    const { coord1 } = pairwiseSeqMap(alignment)
    for (const coord of Object.keys(coord1)) {
      selectResidue({ plugin, selectedResidue: +coord })
    }
  }, [plugin, structureLoaded, alignment])

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
