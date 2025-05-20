import React, { useState } from 'react'

import { Dialog } from '@jbrowse/core/ui'
import { AbstractTrackModel, Feature } from '@jbrowse/core/util'
import { Tab, Tabs } from '@mui/material'

import AlphaFoldDBSearch from './AlphaFoldDBSearch'
import HelpButton from './HelpButton'
import TabPanel from './TabPanel'
import UserProvidedStructure from './UserProvidedStructure'

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
      titleNode={
        <>
          Launch protein view <HelpButton />
        </>
      }
      open
      onClose={() => {
        handleClose()
      }}
    >
      <Tabs
        value={choice}
        onChange={(_, val) => {
          setChoice(val)
        }}
      >
        <Tab value={0} label="AlphaFoldDB search" />
        <Tab value={1} label="Open file manually" />
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
    </Dialog>
  )
}
