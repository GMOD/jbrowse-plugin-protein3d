import React, { useState } from 'react'
import { observer } from 'mobx-react'
import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'

// icons
import MenuIcon from '@mui/icons-material/Menu'

// locals
import { JBrowsePluginProteinViewModel } from '../model'
import ProteinAlignment from './ProteinAlignment'
import { Visibility } from '@mui/icons-material'

const ProteinViewHeader = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { clickString, hoverString, showHighlight, zoomToBaseLevel } = model
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
        <CascadingMenuButton
          menuItems={[
            {
              label: 'Show alignment',
              type: 'checkbox',
              checked: show,
              icon: Visibility,
              onClick: () => setShow(!show),
            },
            {
              label: 'Show highlight',
              type: 'checkbox',
              checked: showHighlight,
              icon: Visibility,
              onClick: () => model.setShowHighlight(!showHighlight),
            },
            {
              label: 'Zoom to base level on click',
              type: 'checkbox',
              checked: zoomToBaseLevel,
              icon: Visibility,
              onClick: () => model.setZoomToBaseLevel(!zoomToBaseLevel),
            },
          ]}
        >
          <MenuIcon />
        </CascadingMenuButton>
      </div>
      <div>{show ? <ProteinAlignment model={model} /> : null}</div>
    </div>
  )
})

export default ProteinViewHeader
