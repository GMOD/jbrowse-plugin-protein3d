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
    <Dialog open maxWidth="lg" onClose={handleClose} title="Protein alignment">
      <DialogContent>
        <Typography2>
          This process searches mygene.info for the transcript ID, in order to
          retrieve the UniProt ID associated with a given transcript ID. Then,
          it uses that UniProt ID to lookup the structure in AlphaFoldDB because
          every UniProt ID has been processed by AlphaFold.
        </Typography2>
        <Typography2>
          If you run into challenges with this workflow e.g. your transcripts
          are not being found in mygene.info and you are interested in using
          this plugin, contact colin.diesh@gmail.com
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
