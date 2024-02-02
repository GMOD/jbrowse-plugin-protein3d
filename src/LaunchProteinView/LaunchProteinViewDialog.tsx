import React, { useState } from 'react'
import { Dialog } from '@jbrowse/core/ui'
import { Tab, Tabs } from '@mui/material'
import { AbstractTrackModel, Feature } from '@jbrowse/core/util'

// locals
import ManualStructureMapping from './ManualStructureMapping'
import PreLoadedStructureMapping from './PreLoadedStructureMapping'
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
        <Tab value={0} label="AlphaFold/Uniprot search" />
        <Tab value={1} label="Pre-loaded" />
        <Tab value={2} label="Manual" />
      </Tabs>
      <TabPanel value={choice} index={0}>
        <MyGeneInfoSearch
          model={model}
          feature={feature}
          handleClose={handleClose}
        />
      </TabPanel>
      <TabPanel value={choice} index={1}>
        <PreLoadedStructureMapping
          feature={feature}
          model={model}
          handleClose={handleClose}
        />
      </TabPanel>
      <TabPanel value={choice} index={2}>
        <ManualStructureMapping
          model={model}
          feature={feature}
          handleClose={handleClose}
        />
      </TabPanel>
    </Dialog>
  )
}
