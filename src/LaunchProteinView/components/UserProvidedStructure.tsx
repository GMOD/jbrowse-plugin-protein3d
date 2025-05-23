import React, { useEffect, useState } from 'react'

import { ErrorMessage, LoadingEllipses } from '@jbrowse/core/ui'
import {
  AbstractTrackModel,
  Feature,
  getContainingView,
  getSession,
} from '@jbrowse/core/util'
import {
  Button,
  DialogActions,
  DialogContent,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'

import HelpButton from './HelpButton'
import MSATable from './MSATable'
import TranscriptSelector from './TranscriptSelector'
import useIsoformProteinSequences from './useIsoformProteinSequences'
import useLocalStructureFileSequence from './useLocalStructureFileSequence'
import useRemoteStructureFileSequence from './useRemoteStructureFileSequence'
import {
  getGeneDisplayName,
  getId,
  getTranscriptDisplayName,
  getTranscriptFeatures,
} from './util'
import ExternalLink from '../../components/ExternalLink'

import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

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
      <ExternalLink href="https://github.com/sokrypton/ColabFold">
        ColabFold
      </ExternalLink>
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
  const [pdbId, setPdbId] = useState('')
  const [choice, setChoice] = useState('file')
  const [error2, setError] = useState<unknown>()
  const [structureURL, setStructureURL] = useState('')
  const [userSelection, setUserSelection] = useState<string>()
  const [showAllProteinSequences, setShowAllProteinSequences] = useState(false)

  // check if we are looking at a 'two-level' or 'three-level' feature by
  // finding exon/CDS subfeatures. we want to select from transcript names
  const options = getTranscriptFeatures(feature)
  const view = getContainingView(model) as LGV
  const selectedTranscript = options.find(val => getId(val) === userSelection)
  const { isoformSequences, error } = useIsoformProteinSequences({
    feature,
    view,
  })
  const protein = isoformSequences?.[userSelection ?? '']
  const { sequences: structureSequences1, error: error3 } =
    useLocalStructureFileSequence({ file })

  const { sequences: structureSequences2, error: error4 } =
    useRemoteStructureFileSequence({ url: structureURL })
  const structureName =
    file?.name ?? structureURL.slice(structureURL.lastIndexOf('/') + 1)
  const structureSequences = structureSequences1 ?? structureSequences2
  const structureSequence = structureSequences?.[0]

  useEffect(() => {
    if (isoformSequences !== undefined) {
      const ret =
        options.find(
          f =>
            isoformSequences[f.id()]?.seq.replaceAll('*', '') ==
            structureSequence,
        ) ?? options.find(f => !!isoformSequences[f.id()])
      setUserSelection(ret?.id())
    }
  }, [options, structureSequence, isoformSequences])

  const e = error ?? error2 ?? error3 ?? error4
  return (
    <>
      <DialogContent className={classes.dialogContent}>
        {e ? <ErrorMessage error={e} /> : null}
        <HelpText />

        <div style={{ display: 'flex', margin: 30 }}>
          <Typography>
            Open your structure file <HelpButton />
          </Typography>

          <FormControl component="fieldset">
            <RadioGroup
              value={choice}
              onChange={event => {
                setChoice(event.target.value)
              }}
            >
              <FormControlLabel value="url" control={<Radio />} label="URL" />
              <FormControlLabel value="file" control={<Radio />} label="File" />
              <FormControlLabel
                value="pdb"
                control={<Radio />}
                label="PDB ID"
              />
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
                onChange={event => {
                  setStructureURL(event.target.value)
                }}
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
                    const file = target.files?.[0]
                    if (file) {
                      setFile(file)
                    }
                  }}
                />
              </Button>
            </div>
          ) : null}
          {choice === 'pdb' ? (
            <TextField
              value={pdbId}
              onChange={event => {
                const s = event.target.value
                setPdbId(s)
                setStructureURL(`https://files.rcsb.org/download/${s}.cif`)
              }}
              label="PDB ID"
            />
          ) : null}
        </div>
        <div style={{ margin: 20 }}>
          {isoformSequences ? (
            structureSequence ? (
              <>
                <TranscriptSelector
                  val={userSelection ?? ''}
                  setVal={setUserSelection}
                  structureSequence={structureSequence}
                  isoforms={options}
                  feature={feature}
                  isoformSequences={isoformSequences}
                />
                <div style={{ margin: 10 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      setShowAllProteinSequences(!showAllProteinSequences)
                    }}
                  >
                    {showAllProteinSequences
                      ? 'Hide all isoform protein sequences'
                      : 'Show all isoform protein sequences'}
                  </Button>

                  {showAllProteinSequences ? (
                    <MSATable
                      structureSequence={structureSequence}
                      structureName={structureName}
                      isoformSequences={isoformSequences}
                    />
                  ) : null}
                </div>
              </>
            ) : null
          ) : (
            <LoadingEllipses title="Loading protein sequences" variant="h6" />
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => {
            handleClose()
          }}
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
                session.addView('ProteinView', {
                  type: 'ProteinView',
                  seq2: protein,
                  feature: selectedTranscript?.toJSON(),
                  connectedViewId: view.id,
                  displayName: `Protein view ${getGeneDisplayName(feature)} - ${getTranscriptDisplayName(selectedTranscript)}`,
                  ...(file ? { data: await file.text() } : {}),
                  ...(structureURL ? { url: structureURL } : {}),
                })
                handleClose()
              } catch (e) {
                console.error(e)
                setError(e)
              }
            })()
          }}
        >
          Launch 3-D protein structure view
        </Button>
      </DialogActions>
    </>
  )
})

export default UserProvidedStructure
