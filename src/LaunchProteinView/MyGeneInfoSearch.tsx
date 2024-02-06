import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react'
import {
  Button,
  DialogActions,
  DialogContent,
  MenuItem,
  TextField,
  TextFieldProps,
  Typography,
} from '@mui/material'
import { makeStyles } from 'tss-react/mui'
import {
  AbstractTrackModel,
  Feature,
  getContainingView,
  getSession,
} from '@jbrowse/core/util'
import { ErrorMessage } from '@jbrowse/core/ui'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// locals
import {
  getGeneDisplayName,
  getId,
  getTranscriptDisplayName,
  getTranscriptFeatures,
} from './util'
import { useFeatureSequence } from './useFeatureSequence'
import { getProteinSequence } from './calculateProteinSequence'
import useMyGeneInfo from './useMyGeneInfo'

const useStyles = makeStyles()(theme => ({
  textAreaFont: {
    fontFamily: 'Courier New',
  },
  section: {
    marginTop: theme.spacing(6),
  },

  dialogContent: {
    width: '80em',
  },
}))

function TextField2({ children, ...rest }: TextFieldProps) {
  return (
    <div>
      <TextField {...rest}>{children}</TextField>
    </div>
  )
}

const MyGeneInfoSearch = observer(function MyGeneInfoSearch({
  feature,
  model,
  handleClose,
}: {
  feature: Feature
  model: AbstractTrackModel
  handleClose: () => void
}) {
  const { classes } = useStyles()
  const session = getSession(model)

  // check if we are looking at a 'two-level' or 'three-level' feature by
  // finding exon/CDS subfeatures. we want to select from transcript names
  const options = getTranscriptFeatures(feature)
  const [userSelection, setUserSelection] = useState(getId(options[0]))
  const view = getContainingView(model) as LinearGenomeViewModel
  const selectedTranscript = options.find(val => getId(val) === userSelection)!
  const { sequence, error: error2 } = useFeatureSequence({
    view,
    feature: selectedTranscript,
  })
  const protein =
    sequence && !('error' in sequence)
      ? getProteinSequence({
          seq: sequence.seq,
          selectedTranscript,
        })
      : ''

  const { result: foundStructureId, error } = useMyGeneInfo({
    id: userSelection,
  })
  console.log({ protein })

  const e = error || error2
  const url = `https://alphafold.ebi.ac.uk/files/AF-${foundStructureId}-F1-model_v4.cif`
  return (
    <>
      <DialogContent className={classes.dialogContent}>
        <div className={classes.section}>
          {e ? <ErrorMessage error={e} /> : null}
          <div>
            Looks up the UniProt ID associated with a given transcript from
            MyGene.info, and uses this to load the 3-D structure from
            AlphaFoldDB
          </div>
          <TextField2
            value={userSelection}
            onChange={event => setUserSelection(event.target.value)}
            label="Choose isoform to search"
            select
          >
            {options.map(val => (
              <MenuItem value={getId(val)} key={val.id()}>
                {getGeneDisplayName(feature)} - {getTranscriptDisplayName(val)}
              </MenuItem>
            ))}
          </TextField2>
          <Typography>Found Uniprot ID: {foundStructureId}</Typography>
          {protein ? null : (
            <Typography>Waiting for protein sequence...</Typography>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => handleClose()}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!foundStructureId || !protein}
          onClick={() => {
            session.addView('ProteinView', {
              type: 'ProteinView',
              url,
              seq2: protein,
              feature: selectedTranscript.toJSON(),
            })
            handleClose()
          }}
        >
          Submit
        </Button>
      </DialogActions>
    </>
  )
})

export default MyGeneInfoSearch
