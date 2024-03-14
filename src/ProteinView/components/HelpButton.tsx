import React, { lazy } from 'react'
import { IconButton } from '@mui/material'
import { getSession } from '@jbrowse/core/util'

// locals
import { JBrowsePluginProteinViewModel } from '../model'

// icons
import Help from '@mui/icons-material/Help'

const HelpDialog = lazy(() => import('./HelpDialog'))

export default function HelpButton({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  return (
    <IconButton
      style={{ float: 'right' }}
      onClick={() =>
        getSession(model).queueDialog(handleClose => [
          HelpDialog,
          { handleClose },
        ])
      }
    >
      <Help />
    </IconButton>
  )
}
