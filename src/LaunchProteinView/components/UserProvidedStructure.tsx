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
  Link,
  Typography,
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

// hooks
import useIsoformProteinSequences from '../useIsoformProteinSequences'
import useLocalStructureFileSequence from './useLocalStructureFileSequence'
import MSATable from './MSATable'
import useRemoteStructureFileSequence from './useRemoteStructureFileSequence'

const useStyles = makeStyles()(theme => ({
  dialogContent: {
    marginTop: theme.spacing(6),
    width: '80em',
  },
  textAreaFont: {
    fontFamily: 'Courier New',
  },
}))

type LGV = LinearGenomeViewModel

function HelpText() {
  return (
    <div style={{ marginBottom: 20 }}>
      Manually supply a protein structure (PDB, mmCIF, etc) for a given
      transcript. You can open the file from the result of running, for example,{' '}
      <Link target="_blank" href="https://github.com/sokrypton/ColabFold">
        ColabFold
      </Link>
      . This plugin will align the protein sequence calculated from the genome
      to the protein sequence embedded in the structure file which allows for
      slight differences in these two representations.
    </div>
  )
}

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
  const [file, setFile] = useState<File>()
  const [choice, setChoice] = useState('file')
  const [error2, setError] = useState<unknown>()
  const [structureURL, setStructureURL] = useState('')
  const [selection, setSelection] = useState<string>()

  // check if we are looking at a 'two-level' or 'three-level' feature by
  // finding exon/CDS subfeatures. we want to select from transcript names
  const options = getTranscriptFeatures(feature)
  const view = getContainingView(model) as LGV
  const selectedTranscript = options.find(val => getId(val) === selection)
  const { isoformSequences, error } = useIsoformProteinSequences({
    feature,
    view,
  })
  const protein = isoformSequences?.[selection ?? '']
  useEffect(() => {
    if (selection === undefined && isoformSequences !== undefined) {
      setSelection(options.find(f => !!isoformSequences[f.id()])?.id())
    }
  }, [options, selection, isoformSequences])

  const { seq: structureSequence1, error: error3 } =
    useLocalStructureFileSequence({ file })

  const { seq: structureSequence2, error: error4 } =
    useRemoteStructureFileSequence({ url: structureURL })
  const structureName =
    file?.name ??
    structureURL.slice(structureURL.indexOf('/')) ??
    'structureSequence'
  const structureSequence = structureSequence1 ?? structureSequence2

  const e = error || error2 || error3 || error4
  return (
    <>
      <DialogContent className={classes.dialogContent}>
        {e ? <ErrorMessage error={e} /> : null}
        <HelpText />
        {isoformSequences ? (
          structureSequence ? (
            <>
              <TranscriptSelector
                val={selection ?? ''}
                setVal={setSelection}
                structureSequence={structureSequence}
                isoforms={options}
                feature={feature}
                isoformSequences={isoformSequences}
              />
              <MSATable
                structureName={structureName}
                structureSequence={structureSequence}
                isoformSequences={isoformSequences}
              />
            </>
          ) : (
            <div>Loading...</div>
          )
        ) : (
          <div style={{ margin: 20 }}>
            <LoadingEllipses title="Loading protein sequences" variant="h6" />
          </div>
        )}
        <div style={{ display: 'flex', margin: 30 }}>
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
            <div>
              <Typography>
                Open a PDB/mmCIF/etc. file from remote URL
              </Typography>
              <TextField
                label="URL"
                value={structureURL}
                onChange={event => setStructureURL(event.target.value)}
              />
            </div>
          ) : null}
          {choice === 'file' ? (
            <div style={{ paddingTop: 20 }}>
              <Typography>
                Open a PDB/mmCIF/etc. file from your local drive
              </Typography>
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
            </div>
          ) : null}
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
          disabled={!(structureURL || file) || !protein || !selectedTranscript}
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            ;(async () => {
              try {
                if (file) {
                  const data = await file.text()
                  session.addView('ProteinView', {
                    type: 'ProteinView',
                    data,
                    seq2: protein,
                    feature: selectedTranscript?.toJSON(),
                    connectedViewId: view.id,
                    displayName: `Protein view ${getGeneDisplayName(feature)} - ${getTranscriptDisplayName(selectedTranscript)}`,
                  })
                } else if (structureURL) {
                  session.addView('ProteinView', {
                    type: 'ProteinView',
                    url: structureURL,
                    seq2: protein,
                    feature: selectedTranscript?.toJSON(),
                    connectedViewId: view.id,
                    displayName: `Protein view ${getGeneDisplayName(feature)} - ${getTranscriptDisplayName(selectedTranscript)}`,
                  })
                }
                handleClose()
              } catch (e) {
                console.error(e)
                setError(e)
              }
            })()
          }}
        >
          Submit
        </Button>
      </DialogActions>
    </>
  )
})

export default UserProvidedStructure
