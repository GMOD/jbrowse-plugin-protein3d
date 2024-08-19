import React, { lazy } from 'react'
import { IconButton } from '@mui/material'
import { getSession } from '@jbrowse/core/util'

// locals
import { JBrowsePluginProteinViewModel } from '../model'

// icons
import Help from '@mui/icons-material/Help'

const ProteinAlignmentHelpDialog = lazy(
  () => import('./ProteinAlignmentHelpDialog'),
)

export default function ProteinAlignmentHelpButton({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  return (
    <IconButton
      style={{ float: 'right' }}
      onClick={() => {
        getSession(model).queueDialog(handleClose => [
          ProteinAlignmentHelpDialog,
          { handleClose },
        ])
      }}
    >
      <Help />
    </IconButton>
  )
}
