import React, { useEffect } from 'react'

import { ErrorMessage, ResizeHandle } from '@jbrowse/core/ui'
import { observer } from 'mobx-react'

import { JBrowsePluginProteinViewModel } from '../model'
import ManualAlignmentDialog from './ManualAlignmentDialog'
import ProteinViewHeader from './ProteinViewHeader'
import css from '../css/molstar'
import useProteinView from '../useProteinView'

const style = document.createElement('style')
style.append(css)
document.head.append(style)

const ProteinView = observer(function ProteinView({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { showControls } = model
  const { plugin, parentRef, error } = useProteinView({
    showControls,
  })

  useEffect(() => {
    model.setMolstarPluginContext(plugin)
  }, [plugin, model])

  return error ? (
    <ErrorMessage error={error} />
  ) : (
    // @ts-expect-error
    <ProteinViewContainer model={model} parentRef={parentRef} />
  )
})

const ProteinViewContainer = observer(function ProteinViewContainer({
  model,
  parentRef,
}: {
  model: JBrowsePluginProteinViewModel
  parentRef?: React.RefObject<HTMLDivElement>
}) {
  const { width, height, error } = model

  return (
    <div style={{ background: '#ccc' }}>
      {error ? <ErrorMessage error={error} /> : null}
      <ProteinViewHeader model={model} />
      <div
        ref={parentRef}
        style={{
          position: 'relative',
          width,
          height,
        }}
      />
      <ResizeHandle
        style={{ height: 4, background: 'grey' }}
        onDrag={delta => {
          return model.setHeight(model.height + delta)
        }}
      />
      <ManualAlignmentDialog model={model} />
    </div>
  )
})

export default ProteinView
