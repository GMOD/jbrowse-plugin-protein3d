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
            <FormLabel component="legend">Local (in-browser)</FormLabel>
            <RadioGroup
              value={tempAlgorithm}
              onChange={event => {
                setTempAlgorithm(event.target.value as AlignmentAlgorithm)
              }}
            >
              <FormControlLabel
                value={ALIGNMENT_ALGORITHMS.NEEDLEMAN_WUNSCH}
                control={<Radio />}
                label="Needleman-Wunsch (global alignment)"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 4, mt: -1, mb: 1 }}
              >
                End-to-end alignment. Runs instantly in browser. Recommended for
                most use cases.
              </Typography>

              <FormControlLabel
                value={ALIGNMENT_ALGORITHMS.SMITH_WATERMAN}
                control={<Radio />}
                label="Smith-Waterman (local alignment)"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 4, mt: -1, mb: 1 }}
              >
                Finds best matching region. Runs instantly in browser.
              </Typography>
            </RadioGroup>

            <FormLabel component="legend" sx={{ mt: 2 }}>
              Remote (EBI EMBOSS API)
            </FormLabel>
            <RadioGroup
              value={tempAlgorithm}
              onChange={event => {
                setTempAlgorithm(event.target.value as AlignmentAlgorithm)
              }}
            >
              <FormControlLabel
                value={ALIGNMENT_ALGORITHMS.MATCHER}
                control={<Radio />}
                label="EMBOSS MATCHER (local alignment)"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 4, mt: -1, mb: 1 }}
              >
                Finds multiple non-overlapping local alignments. Requires
                network.
              </Typography>

              <FormControlLabel
                value={ALIGNMENT_ALGORITHMS.WATER}
                control={<Radio />}
                label="EMBOSS WATER (local alignment)"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 4, mt: -1, mb: 1 }}
              >
                Classic Smith-Waterman via EBI. Requires network.
              </Typography>

              <FormControlLabel
                value={ALIGNMENT_ALGORITHMS.NEEDLE}
                control={<Radio />}
                label="EMBOSS NEEDLE (global alignment)"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 4, mt: -1, mb: 1 }}
              >
                Needleman-Wunsch via EBI. Requires network.
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
