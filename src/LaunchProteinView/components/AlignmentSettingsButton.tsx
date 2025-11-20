import React, { useState } from 'react'

import SettingsIcon from '@mui/icons-material/Settings'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material'

import {
  ALIGNMENT_ALGORITHMS,
  AlignmentAlgorithm,
} from '../../ProteinView/types'

interface AlignmentSettingsButtonProps {
  value: AlignmentAlgorithm
  onChange: (algorithm: AlignmentAlgorithm) => void
}

export default function AlignmentSettingsButton({
  value,
  onChange,
}: AlignmentSettingsButtonProps) {
  const [open, setOpen] = useState(false)
  const [tempAlgorithm, setTempAlgorithm] = useState<AlignmentAlgorithm>(value)

  const handleOpen = () => {
    setTempAlgorithm(value)
    setOpen(true)
  }

  const handleSave = () => {
    onChange(tempAlgorithm)
    setOpen(false)
  }

  const handleCancel = () => {
    setTempAlgorithm(value)
    setOpen(false)
  }

  return (
    <>
      <IconButton onClick={handleOpen} size="small" title="Alignment settings">
        <SettingsIcon />
      </IconButton>

      <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Alignment Algorithm Settings</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose the algorithm for aligning transcript sequences to protein
            structures. This setting will be saved for future sessions.
          </Typography>

          <FormControl component="fieldset">
            <FormLabel component="legend">Algorithm</FormLabel>
            <RadioGroup
              value={tempAlgorithm}
              onChange={event => {
                setTempAlgorithm(event.target.value as AlignmentAlgorithm)
              }}
            >
              <FormControlLabel
                value={ALIGNMENT_ALGORITHMS.MATCHER}
                control={<Radio />}
                label="MATCHER (local alignment, default)"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 4, mt: -1, mb: 1 }}
              >
                Best for sequences with different lengths or partial matches.
                Recommended for most use cases.
              </Typography>

              <FormControlLabel
                value={ALIGNMENT_ALGORITHMS.WATER}
                control={<Radio />}
                label="WATER (local alignment, Smith-Waterman)"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 4, mt: -1, mb: 1 }}
              >
                Classic local alignment algorithm, finds best matching region
                regardless of length differences.
              </Typography>

              <FormControlLabel
                value={ALIGNMENT_ALGORITHMS.NEEDLE}
                control={<Radio />}
                label="NEEDLE (global alignment, Needleman-Wunsch)"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 4, mt: -1, mb: 1 }}
              >
                End-to-end alignment for sequences of similar length. Use when
                sequences should align completely.
              </Typography>
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
