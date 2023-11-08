import React, { useState } from 'react'
import { Dialog } from '@jbrowse/core/ui'
import { Button, DialogActions, DialogContent, Tab, Tabs } from '@mui/material'
import { Feature, getSession } from '@jbrowse/core/util'

// locals
import ManualForm from './ManualForm'
import AutoForm from './AutoForm'
import TabPanel from './TabPanel'
import { makeStyles } from 'tss-react/mui'
import { Mapping } from '../ProteinView/model'

const useStyles = makeStyles()({
  dialogContent: {
    width: '80em',
  },
})

export default function LaunchProteinViewDialog({
  handleClose,
  feature,
  model,
}: {
  handleClose: () => void
  feature: Feature
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any
}) {
  const { classes } = useStyles()
  const session = getSession(model)
  const [choice, setChoice] = useState(0)
  const [mapping, setMapping] = useState<Mapping[]>([])

  const [url, setUrl] = useState('')
  return (
    <Dialog
      maxWidth="xl"
      title="Launch protein view"
      onClose={() => handleClose()}
      open
    >
      <DialogContent className={classes.dialogContent}>
        <Tabs value={choice} onChange={(_, val) => setChoice(val)}>
          <Tab value={0} label="Auto" />
          <Tab value={1} label="Manual" />
        </Tabs>
        <TabPanel value={choice} index={0}>
          <AutoForm
            feature={feature}
            mapping={mapping}
            url={url}
            setMapping={setMapping}
            setUrl={setUrl}
            // @ts-expect-error
            session={session}
          />
        </TabPanel>
        <TabPanel value={choice} index={1}>
          <ManualForm
            url={url}
            setUrl={setUrl}
            mapping={mapping}
            setMapping={setMapping}
          />
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button
          color="primary"
          variant="contained"
          onClick={() => {
            session.addView('ProteinView', {
              type: 'ProteinView',
              url,
              mapping,
            })
            handleClose()
          }}
        >
          Submit
        </Button>
        <Button
          color="secondary"
          variant="contained"
          onClick={() => handleClose()}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
}
