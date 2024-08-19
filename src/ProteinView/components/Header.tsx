import React from 'react'
import { observer } from 'mobx-react'
import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'

// icons
import MenuIcon from '@mui/icons-material/Menu'
import Visibility from '@mui/icons-material/Visibility'

// locals
import { JBrowsePluginProteinViewModel } from '../model'
import ProteinAlignment from './ProteinAlignment'
import { LoadingEllipses } from '@jbrowse/core/ui'

const ProteinViewHeader = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { alignment, showAlignment } = model
  return (
    <div>
      <InformativeHeaderArea model={model} />
      {showAlignment ? (
        alignment ? (
          <ProteinAlignment model={model} />
        ) : (
          <LoadingEllipses message="Loading pairwise alignment" />
        )
      ) : null}
    </div>
  )
})

const InformativeHeaderArea = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const {
    showAlignment,
    clickString,
    hoverString,
    showHighlight,
    zoomToBaseLevel,
  } = model
  return (
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
            label: 'Show pairwise alignment area',
            type: 'checkbox',
            checked: showAlignment,
            icon: Visibility,
            onClick: () => {
              model.setShowAlignment(!showAlignment)
            },
          },
          {
            label: 'Show pairwise alignment as highlight',
            type: 'checkbox',
            checked: showHighlight,
            icon: Visibility,
            onClick: () => {
              model.setShowHighlight(!showHighlight)
            },
          },
          {
            label: 'Zoom to base level on click',
            type: 'checkbox',
            checked: zoomToBaseLevel,
            icon: Visibility,
            onClick: () => {
              model.setZoomToBaseLevel(!zoomToBaseLevel)
            },
          },
        ]}
      >
        <MenuIcon />
      </CascadingMenuButton>
    </div>
  )
})

export default ProteinViewHeader
