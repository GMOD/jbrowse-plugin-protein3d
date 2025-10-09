import React from 'react'

import { isSessionWithAddTracks } from '@jbrowse/core/util'
import { Button } from '@mui/material'

import { launchProteinAnnotationView } from './launchProteinAnnotationView'
import { getGeneDisplayName, getTranscriptDisplayName } from './util'

import type { Feature } from '@jbrowse/core/util'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

interface ProteinViewActionsProps {
  handleClose: () => void
  uniprotId?: string
  userSelectedProteinSequence?: { seq: string }
  selectedTranscript?: Feature
  url?: string
  confidenceUrl?: string
  feature: Feature
  view: LinearGenomeViewModel
  session: any
}

/**
 * Component for the dialog action buttons (Cancel, Launch 3D, Launch 1D)
 */
export default function ProteinViewActions({
  handleClose,
  uniprotId,
  userSelectedProteinSequence,
  selectedTranscript,
  url,
  confidenceUrl,
  feature,
  view,
  session,
}: ProteinViewActionsProps) {
  const isLaunchDisabled =
    !uniprotId || !userSelectedProteinSequence || !selectedTranscript

  const handleLaunch3DView = () => {
    if (!selectedTranscript) return

    session.addView('ProteinView', {
      type: 'ProteinView',
      isFloating: true,
      structures: [
        {
          url,
          userProvidedTranscriptSequence: userSelectedProteinSequence?.seq,
          feature: selectedTranscript.toJSON(),
          connectedViewId: view.id,
        },
      ],
      displayName: [
        'Protein view',
        uniprotId,
        getGeneDisplayName(feature),
        getTranscriptDisplayName(selectedTranscript),
      ].join(' - '),
    })
    handleClose()
  }

  const handleLaunch1DView = () => {
    if (uniprotId && isSessionWithAddTracks(session) && selectedTranscript) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      ;(async () => {
        try {
          await launchProteinAnnotationView({
            session,
            selectedTranscript,
            feature,
            uniprotId,
            confidenceUrl,
          })
        } catch (e) {
          console.error(e)
          session.notifyError(`${e}`, e)
        }
      })()
    }
    handleClose()
  }

  return (
    <>
      <Button
        variant="contained"
        color="secondary"
        onClick={() => {
          handleClose()
        }}
      >
        Cancel
      </Button>
      <Button
        variant="contained"
        color="primary"
        disabled={isLaunchDisabled}
        onClick={handleLaunch3DView}
      >
        Launch 3-D protein structure view
      </Button>
      <Button
        variant="contained"
        disabled={isLaunchDisabled}
        onClick={handleLaunch1DView}
      >
        Launch 1-D protein annotation view
      </Button>
    </>
  )
}
