import React, { useState } from 'react'

import { Button, Menu, MenuItem, Typography } from '@mui/material'

import AlignmentSettingsButton from './AlignmentSettingsButton'
import {
  ALIGNMENT_ALGORITHM_LABELS,
  AlignmentAlgorithm,
} from '../../ProteinView/types'
import {
  hasMsaViewPlugin,
  launch1DProteinView,
  launch3DProteinView,
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const menuOpen = Boolean(anchorEl)

  const isLaunchDisabled =
    !uniprotId || !userSelectedProteinSequence || !selectedTranscript

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLaunch3DView = () => {
    handleMenuClose()
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
    handleMenuClose()
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
    handleMenuClose()
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
        onClick={handleMenuClick}
      >
        Launch
      </Button>
      <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose}>
        <MenuItem onClick={handleLaunch3DView}>
          Launch 3D protein structure view
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleLaunch1DView().catch((e: unknown) => {
              console.error(e)
            })
          }}
        >
          Launch 1D protein annotation view
        </MenuItem>
        {hasMsaViewPlugin() ? (
          <MenuItem onClick={handleLaunchMSAView}>Launch MSA view</MenuItem>
        ) : null}
      </Menu>
    </>
  )
}
