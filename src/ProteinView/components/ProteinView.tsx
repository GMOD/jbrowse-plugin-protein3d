import React, { useEffect } from 'react'
import { observer } from 'mobx-react'
import { ErrorMessage, ResizeHandle } from '@jbrowse/core/ui'

// locals
import { JBrowsePluginProteinViewModel } from '../model'
import ProteinViewHeader from './ProteinViewHeader'

// hooks
import useProteinView from '../useProteinView'

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

  useEffect(() => {
    model.setMolstarPluginContext(plugin)
  }, [plugin, model])

  return error ? (
    <ErrorMessage error={error} />
  ) : (
    <ProteinViewContainer model={model} parentRef={parentRef} />
  )
})

const ProteinViewContainer = observer(function ({
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
          model.setHeight(model.height + delta)
        }}
      />
    </div>
  )
})

export default ProteinView
