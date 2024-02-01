import React, { useState } from 'react'
import { Dialog } from '@jbrowse/core/ui'
import { Tab, Tabs } from '@mui/material'
import { Feature, getSession } from '@jbrowse/core/util'

// locals
import ManualForm from './ManualForm'
import AutoForm from './AutoForm'
import PDBSearch from './PDBSearch'
import TabPanel from './TabPanel'
import { makeStyles } from 'tss-react/mui'
import { Mapping } from '../ProteinView/model'

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
      <Tabs value={choice} onChange={(_, val) => setChoice(val)}>
        <Tab value={0} label="PDB search" />
        <Tab value={1} label="Pre-loaded data" />
        <Tab value={2} label="Manual" />
      </Tabs>
      <TabPanel value={choice} index={0}>
        <PDBSearch feature={feature} model={model} handleClose={handleClose} />
      </TabPanel>
      <TabPanel value={choice} index={1}>
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
      <TabPanel value={choice} index={2}>
        <ManualForm
          url={url}
          setUrl={setUrl}
          mapping={mapping}
          setMapping={setMapping}
        />
      </TabPanel>
    </Dialog>
  )
}
