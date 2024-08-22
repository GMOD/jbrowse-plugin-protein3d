import React, { useEffect } from 'react'
import { observer } from 'mobx-react'
import { ErrorMessage } from '@jbrowse/core/ui'
import { PluginContext } from 'molstar/lib/mol-plugin/context'

// locals
import { JBrowsePluginProteinViewModel } from '../model'
import Header from './Header'

// hooks
import useProteinView from '../useProteinView'
import useProteinViewClickBehavior from '../useProteinViewClickBehavior'
import useProteinViewHoverBehavior from '../useProteinViewHoverBehavior'

// utils
import selectResidue from '../selectResidue'
import highlightResidue from '../highlightResidue'
import clearSelection from '../clearSelection'

// css
import css from '../css/molstar'

const style = document.createElement('style')
style.append(css)
document.head.append(style)

const ProteinView = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { showControls } = model
  const { plugin, parentRef, error } = useProteinView({
    showControls,
  })
  return error ? (
    <ErrorMessage error={error} />
  ) : (
    <ProteinViewContainer model={model} plugin={plugin} parentRef={parentRef} />
  )
})

const ProteinViewContainer = observer(function ({
  model,
  plugin,
  parentRef,
}: {
  model: JBrowsePluginProteinViewModel
  plugin?: PluginContext
  parentRef?: React.RefObject<HTMLDivElement>
}) {
  const {
    width,
    height,
    showHighlight,
    // structureSeqToTranscriptSeqPosition,
    // structureSeqHoverPos,
    // alignment,
  } = model

  // const { error } = useProteinViewClickBehavior({ plugin, model })
  // useProteinViewHoverBehavior({ plugin, model })

  // const structure =
  //   plugin?.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data

  // useEffect(() => {
  //   if (!plugin || !structureSeqToTranscriptSeqPosition || !structure) {
  //     return
  //   }
  //   if (showHighlight) {
  //     for (const coord of Object.keys(structureSeqToTranscriptSeqPosition)) {
  //       selectResidue({
  //         structure,
  //         plugin,
  //         selectedResidue: +coord + 1,
  //       })
  //     }
  //   } else {
  //     clearSelection({ plugin })
  //   }
  // }, [plugin, structure, showHighlight, structureSeqToTranscriptSeqPosition])
  //
  // useEffect(() => {
  //   if (!plugin || !structure) {
  //     return
  //   }
  //
  //   if (structureSeqHoverPos === undefined) {
  //     console.warn('not found')
  //   } else {
  //     highlightResidue({
  //       structure,
  //       plugin,
  //       selectedResidue: structureSeqHoverPos,
  //     })
  //   }
  // }, [plugin, structure, structureSeqHoverPos])
  const error = undefined
  const alignment = undefined
  return (
    <div style={{ background: alignment ? undefined : '#ccc' }}>
      {error ? <ErrorMessage error={error} /> : null}
      <Header model={model} />
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
