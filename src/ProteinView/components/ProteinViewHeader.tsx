import React from 'react'
import { observer } from 'mobx-react'
import { ProteinViewModel } from '../model'

const ProteinViewHeader = observer(function ({
  model,
}: {
  model: ProteinViewModel
}) {
  const { url, mouseClickedString, alignment } = model
  return (
    <div>
      {url} {mouseClickedString}{' '}
      {!alignment ? <div>Loading pairwise alignment...</div> : null}
    </div>
  )
})

export default ProteinViewHeader
