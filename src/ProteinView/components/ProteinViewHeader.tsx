import React from 'react'

import { LoadingEllipses } from '@jbrowse/core/ui'
import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import MenuIcon from '@mui/icons-material/Menu'
import Visibility from '@mui/icons-material/Visibility'
import { observer } from 'mobx-react'

import { JBrowsePluginProteinViewModel } from '../model'
import ProteinAlignment from './ProteinAlignment'

const ProteinViewHeader = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { structures, showAlignment } = model
  return (
    <div>
      <InformativeHeaderArea model={model} />
      {showAlignment
        ? structures.map((structure, idx) => {
            const { pairwiseAlignment } = structure
            return (
              <div key={idx}>
                {pairwiseAlignment ? (
                  <ProteinAlignment key={idx} model={structure} />
                ) : (
                  <LoadingEllipses message="Loading pairwise alignment" />
                )}
              </div>
            )
          })
        : null}
    </div>
  )
})

const StructureInfoHeaderArea = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  return model.structures.map((s, id) => {
    const { clickString, hoverString } = s

    return (
      <span key={id}>
        {[
          clickString ? `Click: ${clickString}` : '',
          hoverString ? `Hover: ${hoverString}` : '',
        ].join(' ')}
      </span>
    )
  })
})

const InformativeHeaderArea = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { showAlignment, showHighlight, zoomToBaseLevel } = model
  return (
    <div style={{ display: 'flex' }}>
      <StructureInfoHeaderArea model={model} />
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
