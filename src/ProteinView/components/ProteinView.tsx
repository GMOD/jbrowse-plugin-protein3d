import React, { useEffect } from 'react'
import { observer } from 'mobx-react'
import { ErrorMessage, ResizeHandle } from '@jbrowse/core/ui'
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

  useEffect(() => {
    model.setMolstarPluginContext(plugin)
  }, [plugin, model])

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
  const { width, height, error } = model

  return (
    <div style={{ background: '#ccc' }}>
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
