import React from 'react'
import { observer } from 'mobx-react'
import { ProteinViewModel } from '../model'

const ProteinViewHeader = observer(function ({
  model,
}: {
  model: ProteinViewModel
}) {
  const { mouseClickedString } = model
  return <div>{mouseClickedString}</div>
})

export default ProteinViewHeader
