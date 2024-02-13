import React, { Suspense, lazy, useState } from 'react'
import { IconButton } from '@mui/material'

// locals
import { Help } from '@mui/icons-material'

const HelpDialog = lazy(() => import('./HelpDialog'))

export default function HelpButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <IconButton style={{ float: 'right' }} onClick={() => setOpen(true)}>
        <Help />
      </IconButton>
      {open ? (
        <Suspense fallback={null}>
          <HelpDialog handleClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </>
  )
}
