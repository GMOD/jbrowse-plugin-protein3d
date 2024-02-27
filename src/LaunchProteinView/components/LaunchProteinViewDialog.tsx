import React, { useState } from 'react'
import { Dialog } from '@jbrowse/core/ui'
import { Tab, Tabs } from '@mui/material'
import { AbstractTrackModel, Feature } from '@jbrowse/core/util'

// locals
import PreLoadedStructureMapping from './PreLoadedStructureMapping'
import AlphaFoldDBSearch from './AlphaFoldDBSearch'
import UserProvidedStructure from './UserProvidedStructure'
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
        <Tab value={0} label="AlphaFoldDB search" />
        <Tab value={1} label="Manual" />
        <Tab value={2} label="Pre-configured" />
      </Tabs>
      <TabPanel value={choice} index={0}>
        <AlphaFoldDBSearch
          model={model}
          feature={feature}
          handleClose={handleClose}
        />
      </TabPanel>
      <TabPanel value={choice} index={1}>
        <UserProvidedStructure
          model={model}
          feature={feature}
          handleClose={handleClose}
        />
      </TabPanel>
      <TabPanel value={choice} index={2}>
        <PreLoadedStructureMapping
          feature={feature}
          model={model}
          handleClose={handleClose}
        />
      </TabPanel>
    </Dialog>
  )
}
