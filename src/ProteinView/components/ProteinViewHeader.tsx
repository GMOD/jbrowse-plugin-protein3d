import React, { useState } from 'react'
import { observer } from 'mobx-react'
import { Button } from '@mui/material'

// locals
import { JBrowsePluginProteinViewModel } from '../model'
import ProteinAlignment from './ProteinAlignment'

const ProteinViewHeader = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { clickString, hoverString, alignment } = model
  const [show, setShow] = useState(true)
  return (
    <div>
      <div style={{ display: 'flex' }}>
        <span>
          {[
            clickString ? `Click: ${clickString}` : '',
            hoverString ? `Hover: ${hoverString}` : '',
          ].join(' ')}
        </span>
        <span style={{ flexGrow: 1 }} />
        {alignment ? (
          <Button
            variant="contained"
            color="primary"
            style={{ float: 'right' }}
            onClick={() => setShow(!show)}
          >
            {show ? 'Hide alignment' : 'Show alignment'}
          </Button>
        ) : null}
      </div>
      <div>
        {!alignment ? (
          <div>Loading pairwise alignment...</div>
        ) : (
          <div>{show ? <ProteinAlignment model={model} /> : null}</div>
        )}
      </div>
    </div>
  )
})

export default ProteinViewHeader
