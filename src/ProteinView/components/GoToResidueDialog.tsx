import React, { useState } from 'react'

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { observer } from 'mobx-react'

import { parseResidueQuery, residueQueryProblem } from '../residueQuery'

import type { JBrowsePluginProteinViewModel } from '../model'

const GoToResidueDialog = observer(function GoToResidueDialog({
  model,
  handleClose,
}: {
  model: Pick<JBrowsePluginProteinViewModel, 'alignmentStructure' | 'addNotice'>
  handleClose: () => void
}) {
  const [text, setText] = useState('')
  const [problem, setProblem] = useState<string>()
  const structure = model.alignmentStructure

  const handleGo = () => {
    const found = residueQueryProblem(text, structure?.mappedEntity)
    const query = parseResidueQuery(text)
    if (found !== undefined || !query || !structure) {
      setProblem(found)
    } else {
      structure
        .focusResidues({
          residues: { start: query.start.number, end: query.end.number },
        })
        .catch((e: unknown) => {
          model.addNotice(e)
        })
      handleClose()
    }
  }

  return (
    <Dialog open onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Go to residue{structure ? ` in ${structure.label}` : ''}
      </DialogTitle>
      <form
        onSubmit={event => {
          event.preventDefault()
          handleGo()
        }}
      >
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Residue"
            placeholder="R248"
            value={text}
            error={problem !== undefined}
            helperText={
              problem ??
              "A number, a range such as 245-250, or A:248 for a chain, in the structure's own numbering"
            }
            onChange={event => {
              setText(event.target.value)
              setProblem(undefined)
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!text.trim()}
          >
            Go
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
})

export default GoToResidueDialog
