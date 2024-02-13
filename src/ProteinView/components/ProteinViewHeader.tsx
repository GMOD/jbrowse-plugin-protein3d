import React from 'react'
import { observer } from 'mobx-react'

// locals
import { JBrowsePluginProteinViewModel } from '../model'
import ProteinAlignment from './ProteinAlignment'

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

export default ProteinViewHeader
