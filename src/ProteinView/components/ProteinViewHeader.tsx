import React from 'react'
import { observer } from 'mobx-react'
import { JBrowsePluginProteinViewModel } from '../model'

const ProteinViewHeader = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { url, mouseClickedString, alignment } = model
  return (
    <>
      <div>
        {url} {mouseClickedString}{' '}
        {!alignment ? (
          <div>Loading pairwise alignment...</div>
        ) : (
          <ProteinAlignment model={model} />
        )}
      </div>
    </>
  )
})

const ProteinAlignment = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { alignment } = model
  return (
    <pre style={{ overflow: 'auto' }}>
      {[
        alignment!.alns[0].seq,
        alignment!.consensus,
        alignment!.alns[1].seq,
      ].join('\n')}
    </pre>
  )
})

export default ProteinViewHeader
