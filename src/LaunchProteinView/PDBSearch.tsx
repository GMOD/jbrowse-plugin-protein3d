import React, { useState } from 'react'
import { observer } from 'mobx-react'
import {
  Button,
  DialogActions,
  DialogContent,
  Link,
  MenuItem,
  TextField,
  TextFieldProps,
} from '@mui/material'
import { makeStyles } from 'tss-react/mui'
import {
  AbstractTrackModel,
  Feature,
  getContainingView,
} from '@jbrowse/core/util'

// locals
import {
  getGeneDisplayName,
  getId,
  getTranscriptDisplayName,
  getTranscriptFeatures,
} from './util'
import { useFeatureSequence } from './useFeatureSequence'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'
import { textfetch } from './fetchUtils'
import { getProteinSequence } from './calculateProteinSequence'
import { ErrorMessage } from '@jbrowse/core/ui'

const useStyles = makeStyles()(theme => ({
  textAreaFont: {
    fontFamily: 'Courier New',
  },
  section: {
    marginTop: theme.spacing(6),
  },
}))

function TextField2({ children, ...rest }: TextFieldProps) {
  return (
    <div>
      <TextField {...rest}>{children}</TextField>
    </div>
  )
}
const AutoForm = observer(function AutoForm({
  feature,
  model,
  handleClose,
}: {
  feature: Feature
  model: AbstractTrackModel
  handleClose: () => void
}) {
  const { classes } = useStyles()
  const view = getContainingView(model) as LinearGenomeViewModel
  const [pdb, setPdb] = useState('')

  // check if we are looking at a 'two-level' or 'three-level' feature by
  // finding exon/CDS subfeatures. we want to select from transcript names
  const options = getTranscriptFeatures(feature)
  const [userSelection, setUserSelection] = useState(getId(options[0]))
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

  const e = error2
  const text = `https://alphafold.ebi.ac.uk/search/sequence/${protein.replaceAll('*', '')}`
  return (
    <>
      <DialogContent>
        <div className={classes.section}>
          <div>
            Find structure associated with sequence from searching PDB API:{' '}
          </div>
          {e ? <ErrorMessage error={e} /> : null}
          <TextField2
            value={userSelection}
            onChange={event => setUserSelection(event.target.value)}
            label="Choose isoform to search on PDB"
            select
          >
            {options.map(val => (
              <MenuItem value={getId(val)} key={val.id()}>
                {getGeneDisplayName(feature)} - {getTranscriptDisplayName(val)}
              </MenuItem>
            ))}
          </TextField2>
          Visit this link <Link href={text}>{text}</Link>, and then paste the
          resulting PDB file back into the form below
          <TextField2
            value={pdb}
            onChange={event => setPdb(event.target.value)}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" color="primary" onClick={() => {}}>
          Submit
        </Button>
        <Button variant="contained" color="secondary" onClick={handleClose}>
          Cancel
        </Button>
      </DialogActions>
    </>
  )
})

export default AutoForm
