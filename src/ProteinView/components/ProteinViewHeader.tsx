import React, { useState } from 'react'
import { observer } from 'mobx-react'

// locals
import { JBrowsePluginProteinViewModel } from '../model'
import ProteinAlignment from './ProteinAlignment'
import { Button } from 'molstar/lib/mol-plugin-ui/controls/common'

const ProteinViewHeader = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { url, clickString, hoverString, alignment } = model
  const [show, setShow] = useState(true)
  return (
    <>
      <div>
        {[
          url,
          clickString ? `Click: ${clickString}` : '',
          hoverString ? `Hover: ${hoverString}` : '',
        ].join(' ')}
        <>
          {!alignment ? (
            <div>Loading pairwise alignment...</div>
          ) : (
            <ProteinAlignment model={model} />
          )}
          <Button style={{ float: 'right' }} onClick={() => setShow(!show)}>
            {show ? 'Hide alignment' : 'Show alignment'}
          </Button>
        </>
      </div>
    </>
  )
})

export default ProteinViewHeader
