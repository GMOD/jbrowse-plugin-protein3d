import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react'
import {
  Button,
  DialogActions,
  Radio,
  RadioGroup,
  DialogContent,
  TextField,
  FormControlLabel,
  FormControl,
} from '@mui/material'
import { makeStyles } from 'tss-react/mui'
import {
  AbstractTrackModel,
  Feature,
  getContainingView,
  getSession,
} from '@jbrowse/core/util'
import { ErrorMessage, LoadingEllipses } from '@jbrowse/core/ui'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// locals
import {
  getGeneDisplayName,
  getId,
  getTranscriptDisplayName,
  getTranscriptFeatures,
} from '../util'
import TranscriptSelector from './TranscriptSelector'
import HelpButton from './HelpButton'

// hooks
import useAllSequences from '../useProteinSequences'

const useStyles = makeStyles()(theme => ({
  dialogContent: {
    marginTop: theme.spacing(6),
    width: '80em',
  },
}))

type LGV = LinearGenomeViewModel

const UserProvidedStructure = observer(function ({
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
  const [userStructureURL, setUserStructureURL] = useState('')
  const [file, setFile] = useState<File>()
  const [choice, setChoice] = useState('file')

  // check if we are looking at a 'two-level' or 'three-level' feature by
  // finding exon/CDS subfeatures. we want to select from transcript names
  const options = getTranscriptFeatures(feature)
  const [userSelection, setUserSelection] = useState<string>()
  const view = getContainingView(model) as LGV
  const selectedTranscript = options.find(val => getId(val) === userSelection)!
  const { seqs, error: error2 } = useAllSequences({ feature, view })
  const protein = seqs?.[userSelection ?? '']
  useEffect(() => {
    if (userSelection === undefined && seqs !== undefined) {
      setUserSelection(options.find(f => !!seqs[f.id()])?.id())
    }
  }, [options, userSelection, seqs])
  console.log({ file })

  const e = error2
  return (
    <>
      <DialogContent className={classes.dialogContent}>
        {e ? <ErrorMessage error={e} /> : null}
        <div>
          Look up AlphaFoldDB structure for given transcript <HelpButton />
        </div>
        {seqs ? (
          <TranscriptSelector
            val={userSelection ?? ''}
            setVal={setUserSelection}
            options={options}
            feature={feature}
            seqs={seqs}
          />
        ) : (
          <div style={{ margin: 20 }}>
            <LoadingEllipses title="Loading protein sequences" variant="h6" />
          </div>
        )}
        <FormControl component="fieldset">
          <RadioGroup
            value={choice}
            onChange={event => setChoice(event.target.value)}
          >
            <FormControlLabel value="url" control={<Radio />} label="URL" />
            <FormControlLabel value="file" control={<Radio />} label="File" />
          </RadioGroup>
        </FormControl>
        {choice === 'url' ? (
          <TextField
            label="Enter URL for mmCIF/PDB structure"
            value={userStructureURL}
            onChange={event => setUserStructureURL(event.target.value)}
          />
        ) : null}
        {choice === 'file' ? (
          <Button variant="outlined" component="label">
            Choose File
            <input
              type="file"
              hidden
              onChange={({ target }) => {
                const file = target?.files?.[0]
                if (file) {
                  setFile(file)
                }
              }}
            />
          </Button>
        ) : null}
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
          disabled={!userStructureURL || !protein}
          onClick={() => {
            session.addView('ProteinView', {
              type: 'ProteinView',
              url: userStructureURL,
              seq2: protein,
              feature: selectedTranscript.toJSON(),
              connectedViewId: view.id,
              displayName: `Protein view ${getGeneDisplayName(feature)} - ${getTranscriptDisplayName(selectedTranscript)}`,
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

export default UserProvidedStructure
