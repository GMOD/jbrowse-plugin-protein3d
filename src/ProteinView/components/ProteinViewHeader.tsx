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
  const { clickString, hoverString, alignment } = model
  return (
    <>
      <div>
        {[
          clickString ? `Click: ${clickString}` : '',
          hoverString ? `Hover: ${hoverString}` : '',
        ].join(' ')}
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
