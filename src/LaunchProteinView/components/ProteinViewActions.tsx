import React from 'react'

import { isSessionWithAddTracks } from '@jbrowse/core/util'
import { Button, Typography } from '@mui/material'

import AlignmentSettingsButton from './AlignmentSettingsButton'
import { launchProteinAnnotationView } from './launchProteinAnnotationView'
import {
  ALIGNMENT_ALGORITHM_LABELS,
  AlignmentAlgorithm,
} from '../../ProteinView/types'
import { getGeneDisplayName, getTranscriptDisplayName } from '../utils/util'

import type { AbstractSessionModel, Feature } from '@jbrowse/core/util'
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
  session: AbstractSessionModel
  alignmentAlgorithm: AlignmentAlgorithm
  onAlignmentAlgorithmChange: (algorithm: AlignmentAlgorithm) => void
  sequencesMatch?: boolean
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
  alignmentAlgorithm,
  onAlignmentAlgorithmChange,
  sequencesMatch,
}: ProteinViewActionsProps) {
  const isLaunchDisabled =
    !uniprotId || !userSelectedProteinSequence || !selectedTranscript

  const handleLaunch3DView = () => {
    if (!selectedTranscript) {
      return
    }

    session.addView('ProteinView', {
      type: 'ProteinView',
      isFloating: true,
      alignmentAlgorithm,
      structures: [
        {
          url,
          userProvidedTranscriptSequence: userSelectedProteinSequence?.seq,
          feature: selectedTranscript.toJSON(),
          connectedViewId: view.id,
        },
      ],
      displayName: [
        ...new Set([
          'Protein view',
          uniprotId,
          getGeneDisplayName(feature),
          getTranscriptDisplayName(selectedTranscript),
        ]),
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
            connectedViewId: view.id,
          })
        } catch (e) {
          console.error(e)
          session.notifyError(`${e}`, e)
        }
      })()
    }
    handleClose()
  }

  // Check if MSA view plugin is available
  // @ts-expect-error
  const hasMsaViewPlugin = typeof window.JBrowsePluginMsaView !== 'undefined'

  const handleLaunchMSAView = () => {
    if (!selectedTranscript || !uniprotId) {
      return
    }

    const msaUrl = `https://alphafold.ebi.ac.uk/files/msa/AF-${uniprotId}-F1-msa_v6.a3m`

    session.addView('MsaView', {
      type: 'MsaView',
      displayName: [
        ...new Set([
          'MSA view',
          uniprotId,
          getGeneDisplayName(feature),
          getTranscriptDisplayName(selectedTranscript),
        ]),
      ].join(' - '),
      connectedViewId: view.id,
      connectedFeature: selectedTranscript.toJSON(),
      init: {
        msaUrl,
      },
    })
    handleClose()
  }

  return (
    <>
      {sequencesMatch === false ? (
        <Typography
          variant="body2"
          sx={{ mr: 2, display: 'flex', alignItems: 'center' }}
        >
          Transcript and structure sequences differ, will run{' '}
          {ALIGNMENT_ALGORITHM_LABELS[alignmentAlgorithm] ?? alignmentAlgorithm}{' '}
          alignment
          <AlignmentSettingsButton
            value={alignmentAlgorithm}
            onChange={onAlignmentAlgorithmChange}
          />
        </Typography>
      ) : null}
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
      {hasMsaViewPlugin ? (
        <Button
          variant="contained"
          disabled={isLaunchDisabled}
          onClick={handleLaunchMSAView}
        >
          Launch MSA view
        </Button>
      ) : null}
    </>
  )
}
