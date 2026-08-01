import React, { useState } from 'react'

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { parsePairwise } from 'clustal-js'
import { observer } from 'mobx-react'

import type { JBrowsePluginProteinViewModel } from '../model'

const ManualAlignmentDialog = observer(function ManualAlignmentDialog({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const [alignment, setAlignment] = useState('')
  const [parseError, setParseError] = useState<string>()
  const { showManualAlignmentDialog, primaryStructure } = model

  const handleClose = () => {
    setAlignment('')
    setParseError(undefined)
    model.setShowManualAlignmentDialog(false)
  }

  const handleApply = () => {
    if (alignment.trim()) {
      try {
        const parsed = parsePairwise(alignment.trim())
        const [row1, row2] = parsed.alns
        // Rejected here rather than committed: every coordinate map is built
        // from these two rows by the `coordinateMapper` getter, which throws on
        // a length mismatch during render — outside this catch, taking the
        // whole view down instead of reporting a bad paste.
        if (!primaryStructure) {
          setParseError('No structure loaded to apply alignment to')
        } else if (
          row1.seq.length === 0 ||
          row1.seq.length !== row2.seq.length
        ) {
          setParseError(
            `The two aligned sequences must be the same non-zero length (got ${row1.seq.length} and ${row2.seq.length})`,
          )
        } else {
          primaryStructure.setAlignment(parsed)
          handleClose()
        }
      } catch (e) {
        setParseError(`Failed to parse alignment: ${e}`)
      }
    }
  }

  if (!showManualAlignmentDialog) {
    return null
  }

  return (
    <Dialog open onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Manual Alignment</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste a pre-computed alignment in Clustal format. The first sequence
          should be the transcript and the second should be the structure.
        </Typography>
        <TextField
          multiline
          rows={12}
          fullWidth
          placeholder={`Example:
transcript  MKAAYLSMFGKEDHKPFGDDEVELFRAVPGLKLKIAG
            |||||||||||||||||||||||||||||||||||||
structure   MKAAYLSMFGKEDHKPFGDDEVELFRAVPGLKLKIAG`}
          value={alignment}
          onChange={e => {
            setAlignment(e.target.value)
            setParseError(undefined)
          }}
          slotProps={{
            htmlInput: { style: { fontFamily: 'monospace', fontSize: 12 } },
          }}
        />
        {parseError ? (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {parseError}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            handleClose()
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            handleApply()
          }}
          variant="contained"
          color="primary"
          disabled={!alignment.trim()}
        >
          Apply Alignment
        </Button>
      </DialogActions>
    </Dialog>
  )
})

export default ManualAlignmentDialog
