import React from 'react'
import {
  Button,
  DialogActions,
  DialogContent,
  Divider,
  Typography,
  TypographyProps,
} from '@mui/material'
import { Dialog } from '@jbrowse/core/ui'

function Typography2({ children }: TypographyProps) {
  return <Typography style={{ margin: 4 }}>{children}</Typography>
}
export default function HelpDialog({
  handleClose,
}: {
  handleClose: () => void
}) {
  return (
    <Dialog
      open
      maxWidth="lg"
      onClose={handleClose}
      title="Automatic protein structure lookup procedure"
    >
      <DialogContent>
        <Typography2>
          The automatic lookup performs the following steps:
          <ol>
            <li>
              searches mygene.info for the transcript ID, in order to retrieve
              the UniProt ID associated with a given transcript ID
            </li>
            <li>
              Then, it uses that UniProt ID to lookup the structure in
              AlphaFoldDB because every UniProt ID has been processed by
              AlphaFold.
            </li>
          </ol>
        </Typography2>
        <Typography2>
          If you run into challenges with this workflow e.g. your transcripts
          are not being found in mygene.info then you can use the Manual import
          form, or contact colin.diesh@gmail.com for troubleshooting
        </Typography2>
      </DialogContent>
      <Divider />
      <DialogActions>
        <Button onClick={() => handleClose()} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
