import React, { useState } from 'react'
import { observer } from 'mobx-react'
import {
  Button,
  DialogActions,
  DialogContent,
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
import { jsonfetch } from './fetchUtils'
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
  const [error, setError] = useState<unknown>()

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

  const e = error || error2
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
          <TextField2
            variant="outlined"
            multiline
            minRows={5}
            maxRows={10}
            fullWidth
            value={
              protein
                ? `>${getTranscriptDisplayName(selectedTranscript)}\n${protein}`
                : 'Loading...'
            }
            InputProps={{
              readOnly: true,
              classes: {
                input: classes.textAreaFont,
              },
            }}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            ;(async () => {
              try {
                const r = {
                  query: {
                    type: 'terminal',
                    service: 'sequence',
                    parameters: {
                      evalue_cutoff: 0.5,
                      identity_cutoff: 0.5,
                      sequence_type: 'protein',
                      value: protein.replaceAll('*', '').slice(0, 50),
                    },
                  },
                  request_options: {
                    scoring_strategy: 'sequence',
                  },
                  return_type: 'polymer_entity',
                }
                console.log({ r })
                console.log(
                  `https://search.rcsb.org/rcsbsearch/v2/query?json=${encodeURIComponent(
                    JSON.stringify(r),
                  )}`,
                )
                const res = await jsonfetch(
                  `https://search.rcsb.org/rcsbsearch/v2/query?json=${encodeURIComponent(
                    JSON.stringify(r),
                  )}`,
                )
                console.log({ res })
              } catch (e) {
                console.error(e)
                setError(e)
              }
            })()
          }}
        >
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
