import React, { useState } from 'react'

import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  MenuList,
  Typography,
} from '@mui/material'

import AlignmentSettingsButton from './AlignmentSettingsButton'
import {
  ALIGNMENT_ALGORITHM_LABELS,
  AlignmentAlgorithm,
} from '../../ProteinView/types'
import {
  hasMsaViewPlugin,
  launch1DProteinView,
  launch3DProteinView,
  launch3DProteinViewWithMsa,
  launchMsaView,
} from '../utils/launchViewUtils'

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
  const [dialogOpen, setDialogOpen] = useState(false)
  const isLaunchDisabled =
    !uniprotId || !userSelectedProteinSequence || !selectedTranscript

  const handleLaunch3DView = () => {
    setDialogOpen(false)
    if (!selectedTranscript) {
      return
    }
    launch3DProteinView({
      session,
      view,
      feature,
      selectedTranscript,
      uniprotId,
      url,
      userProvidedTranscriptSequence: userSelectedProteinSequence?.seq,
      alignmentAlgorithm,
    })

    handleClose()
  }

  const handleLaunch1DView = async () => {
    setDialogOpen(false)
    if (!uniprotId || !selectedTranscript) {
      return
    }
    try {
      await launch1DProteinView({
        session,
        view,
        feature,
        selectedTranscript,
        uniprotId,
        confidenceUrl,
      })
    } catch (e) {
      console.error(e)
      session.notifyError(`${e}`, e)
    }
    handleClose()
  }

  const handleLaunchMSAView = () => {
    setDialogOpen(false)
    if (!selectedTranscript || !uniprotId) {
      return
    }
    launchMsaView({
      session,
      view,
      feature,
      selectedTranscript,
      uniprotId,
    })

    handleClose()
  }

  const handleLaunch3DWithMsa = () => {
    setDialogOpen(false)
    if (!selectedTranscript || !uniprotId) {
      return
    }
    launch3DProteinViewWithMsa({
      session,
      view,
      feature,
      selectedTranscript,
      uniprotId,
      url,
      userProvidedTranscriptSequence: userSelectedProteinSequence?.seq,
      alignmentAlgorithm,
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
        onClick={() => {
          setDialogOpen(true)
        }}
      >
        Launch
      </Button>
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
        }}
      >
        <DialogTitle>Launch options</DialogTitle>
        <DialogContent>
          <MenuList>
            <MenuItem onClick={handleLaunch3DView}>
              <div>
                <Typography variant="body1">
                  Launch 3D protein structure view
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View protein structure with genome-to-structure coordinate
                  mapping
                </Typography>
              </div>
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleLaunch1DView().catch((e: unknown) => {
                  console.error(e)
                })
              }}
            >
              <div>
                <Typography variant="body1">
                  Launch 1D protein annotation view
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View protein features and annotations as a linear track
                </Typography>
              </div>
            </MenuItem>
            {hasMsaViewPlugin() ? (
              <>
                <MenuItem onClick={handleLaunchMSAView}>
                  <div>
                    <Typography variant="body1">Launch MSA view</Typography>
                    <Typography variant="body2" color="text.secondary">
                      View AlphaFold a3m multiple sequence alignment
                    </Typography>
                  </div>
                </MenuItem>
                <MenuItem onClick={handleLaunch3DWithMsa}>
                  <div>
                    <Typography variant="body1">
                      Launch 3D structure + MSA view
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Launch both views with AlphaFold a3m MSA
                    </Typography>
                  </div>
                </MenuItem>
              </>
            ) : null}
          </MenuList>
        </DialogContent>
      </Dialog>
    </>
  )
}
