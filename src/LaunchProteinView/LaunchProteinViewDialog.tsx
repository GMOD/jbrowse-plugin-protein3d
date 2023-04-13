import React, { useState } from 'react'
import { Dialog } from '@jbrowse/core/ui'
import { Button, DialogActions, DialogContent, Tab, Tabs } from '@mui/material'
import { Feature, getSession } from '@jbrowse/core/util'

// locals
import ManualForm from './ManualForm'
import AutoForm from './AutoForm'
import TabPanel from './TabPanel'
import { makeStyles } from 'tss-react/mui'

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
  model: any
}) {
  const { classes } = useStyles()
  const [choice, setChoice] = useState(0)
  const [mapping, setMapping] = useState(
    'chr1:1-100\tA541.1:1-33\nchr1:201-300\tA541.1:34-66',
  )
  const [url, setUrl] = useState('')
  return (
    <Dialog
      maxWidth="xl"
      title="Launch protein view"
      onClose={() => handleClose()}
      open
    >
      <DialogContent className={classes.dialogContent}>
        {/* MUI produces an tabs related error on initial load because plugins
receive suspense components from jbrowse reexports, example issue xref
https://github.com/mui/material-ui/issues/32749#issuecomment-1270738582 */}
        <Tabs
          value={choice}
          onChange={(_, val) => setChoice(val)}
          aria-label="basic tabs example"
        >
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
            const session = getSession(model)
            console.log({ mapping })
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
