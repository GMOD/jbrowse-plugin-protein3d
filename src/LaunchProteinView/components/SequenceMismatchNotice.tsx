import React from 'react'

import { Typography } from '@mui/material'

import {
  ALIGNMENT_ALGORITHM_LABELS,
  DEFAULT_ALIGNMENT_ALGORITHM,
} from '../../ProteinView/types'

export default function SequenceMismatchNotice() {
  return (
    <Typography variant="body2" sx={{ mr: 2 }}>
      Transcript and structure sequences differ, will run{' '}
      {ALIGNMENT_ALGORITHM_LABELS[DEFAULT_ALIGNMENT_ALGORITHM]} alignment
    </Typography>
  )
}
