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
    structureSeqToTranscriptSeqPosition,
    seq2,
    structureSeqHoverPos,
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
    if (!plugin || !structureSeqToTranscriptSeqPosition || !structure) {
      return
    }
    for (const coord of Object.keys(structureSeqToTranscriptSeqPosition)) {
      selectResidue({
        structure,
        plugin,
        selectedResidue: +coord + 1,
      })
    }
  }, [plugin, structure, structureSeqToTranscriptSeqPosition])

  useEffect(() => {
    if (!plugin || !structure || structureSeqHoverPos === undefined) {
      return
    }
    if (structureSeqHoverPos !== undefined) {
      highlightResidue({
        structure,
        plugin,
        selectedResidue: structureSeqHoverPos,
      })
    } else {
      console.warn('not found')
    }
  }, [plugin, structure, structureSeqHoverPos])

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
