import React, { useState } from 'react'
import { Dialog } from '@jbrowse/core/ui'
import { Tab, Tabs } from '@mui/material'
import { AbstractTrackModel, Feature } from '@jbrowse/core/util'

// locals
import ManualForm from './ManualForm'
import PreLoadedPDBMapping from './PreLoadedPDBMapping'
import MyGeneInfoSearch from './MyGeneInfoSearch'
import TabPanel from './TabPanel'

export default function LaunchProteinViewDialog({
  handleClose,
  feature,
  model,
}: {
  handleClose: () => void
  feature: Feature
  model: AbstractTrackModel
}) {
  const [choice, setChoice] = useState(0)
  return (
    <Dialog
      maxWidth="xl"
      title="Launch protein view"
      onClose={() => handleClose()}
      open
    >
      <Tabs value={choice} onChange={(_, val) => setChoice(val)}>
        <Tab value={0} label="Pre-loaded data" />
        <Tab value={1} label="Manual" />
        <Tab value={2} label="MyGene.info search" />
      </Tabs>

      <TabPanel value={choice} index={0}>
        <PreLoadedPDBMapping
          feature={feature}
          model={model}
          handleClose={handleClose}
        />
      </TabPanel>
      <TabPanel value={choice} index={1}>
        <ManualForm model={model} feature={feature} handleClose={handleClose} />
      </TabPanel>
      <TabPanel value={choice} index={2}>
        <MyGeneInfoSearch
          model={model}
          feature={feature}
          handleClose={handleClose}
        />
      </TabPanel>
    </Dialog>
  )
}
