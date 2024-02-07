import React, { useEffect } from 'react'
import { observer } from 'mobx-react'
import { ErrorMessage } from '@jbrowse/core/ui'

// locals
import { ProteinViewModel } from '../model'
import ProteinViewHeader from './ProteinViewHeader'

// hooks
import useProteinView from './useProteinView'
import useProteinViewClickActionBehavior from './useProteinViewClickActionBehavior'

// note: css must be injected into the js code for jbrowse plugins
import css from './molstar'

const style = document.createElement('style')
style.append(css)
document.head.append(style)

const ProteinView = observer(function ({ model }: { model: ProteinViewModel }) {
  const { width, height, url, showControls, seq2 } = model
  const { plugin, seq, parentRef, error } = useProteinView({
    url,
    showControls,
  })
  const { error: error2 } = useProteinViewClickActionBehavior({ plugin, model })

  useEffect(() => {
    model.setSeqs(seq, seq2)
  }, [seq, model, seq2])

  const e = error || error2
  return e ? (
    <ErrorMessage error={e} />
  ) : (
    <div>
      <ProteinViewHeader model={model} />
      <div ref={parentRef} style={{ position: 'relative', width, height }} />
    </div>
  )
})

export default ProteinView
