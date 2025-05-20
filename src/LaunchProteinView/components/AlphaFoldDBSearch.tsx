import React, { useEffect, useState } from 'react'

import { ErrorMessage, LoadingEllipses } from '@jbrowse/core/ui'
import {
  getContainingView,
  getSession,
  isSessionWithAddTracks,
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
} from '@mui/material'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'

import AlphaFoldDBSearchStatus from './AlphaFoldDBSearchStatus'
import TranscriptSelector from './TranscriptSelector'
import { launchProteinAnnotationView } from './launchProteinAnnotationView'
import useIsoformProteinSequences from './useIsoformProteinSequences'
import useMyGeneInfoUniprotIdLookup from './useMyGeneInfoUniprotIdLookup'
import useRemoteStructureFileSequence from './useRemoteStructureFileSequence'
import {
  getDisplayName,
  getGeneDisplayName,
  getId,
  getTranscriptDisplayName,
  getTranscriptFeatures,
} from './util'

import type { AbstractTrackModel, Feature } from '@jbrowse/core/util'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

const useStyles = makeStyles()({
  dialogContent: {
    width: '80em',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
})

function UniProtIDNotFoundMessage() {
  return (
    <div>
      UniProt ID not found. You can try manually searching on{' '}
      <a href="https://alphafold.ebi.ac.uk/" target="_blank" rel="noreferrer">
        AlphaFoldDB
      </a>{' '}
      for your gene. After visiting the above link, you can switch to "Open file
      manually" and paste in the mmCIF link
    </div>
  )
}

function EnterUniProtID() {
  return (
    <div>
      Please enter a valid UniProt ID. You can search for UniProt IDs at{' '}
      <a href="https://www.uniprot.org/" target="_blank" rel="noreferrer">
        UniProt.org
      </a>{' '}
      or{' '}
      <a href="https://alphafold.ebi.ac.uk/" target="_blank" rel="noreferrer">
        AlphaFoldDB
      </a>
    </div>
  )
}

const AlphaFoldDBSearch = observer(function ({
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
  const [lookupMode, setLookupMode] = useState<'auto' | 'manual'>('auto')
  const [manualUniprotId, setManualUniprotId] = useState<string>('')

  // check if we are looking at a 'two-level' or 'three-level' feature by
  // finding exon/CDS subfeatures. we want to select from transcript names
  const options = getTranscriptFeatures(feature)
  const [userSelection, setUserSelection] = useState<string>()
  const view = getContainingView(model) as LinearGenomeViewModel
  const selectedTranscript = options.find(val => getId(val) === userSelection)
  const {
    isoformSequences,
    isLoading: isIsoformProteinSequencesLoading,
    error: isoformProteinSequencesError,
  } = useIsoformProteinSequences({
    feature,
    view,
  })
  const userSelectedProteinSequence = isoformSequences?.[userSelection ?? '']
  const {
    uniprotId: autoUniprotId,
    isLoading: isMyGeneLoading,
    error: myGeneError,
  } = useMyGeneInfoUniprotIdLookup({
    id: selectedTranscript
      ? getDisplayName(selectedTranscript)
      : getDisplayName(feature),
  })

  // Use either the automatically looked up UniProt ID or the manually entered one
  const uniprotId = lookupMode === 'auto' ? autoUniprotId : manualUniprotId

  const url = uniprotId
    ? `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v4.cif`
    : undefined
  const {
    sequences: structureSequences,
    isLoading: isRemoteStructureSequenceLoading,
    error: remoteStructureSequenceError,
  } = useRemoteStructureFileSequence({ url })

  const e =
    myGeneError ?? isoformProteinSequencesError ?? remoteStructureSequenceError

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

  const loadingStatus1 = isRemoteStructureSequenceLoading
    ? 'Loading sequence from remote structure file'
    : ''
  const loadingStatus2 = isMyGeneLoading
    ? 'Looking up UniProt ID from mygene.info'
    : ''
  const loadingStatus3 = isIsoformProteinSequencesLoading
    ? 'Loading protein sequences from transcript isoforms'
    : ''
  const loadingStatuses = [
    loadingStatus1,
    loadingStatus2,
    loadingStatus3,
  ].filter(f => !!f)

  return (
    <>
      <DialogContent className={classes.dialogContent}>
        {e ? <ErrorMessage error={e} /> : null}

        <FormControl component="fieldset">
          <RadioGroup
            row
            value={lookupMode}
            onChange={event => {
              setLookupMode(event.target.value as 'auto' | 'manual')
            }}
          >
            <FormControlLabel
              value="auto"
              control={<Radio />}
              label="Automatic UniProt ID lookup"
            />
            <FormControlLabel
              value="manual"
              control={<Radio />}
              label="Manual UniProt ID entry"
            />
          </RadioGroup>
        </FormControl>

        {lookupMode === 'manual' && (
          <TextField
            label="UniProt ID"
            variant="outlined"
            value={manualUniprotId}
            onChange={e => {
              setManualUniprotId(e.target.value)
            }}
            placeholder="Enter UniProt ID (e.g. P68871)"
            helperText="Enter a valid UniProt ID to load the corresponding protein structure"
          />
        )}
        {loadingStatuses.length > 0
          ? loadingStatuses.map(l => (
              <LoadingEllipses key={l} variant="h6" message={l} />
            ))
          : null}

        {lookupMode === 'auto' ? (
          isMyGeneLoading || autoUniprotId ? null : (
            <UniProtIDNotFoundMessage />
          )
        ) : (
          !manualUniprotId && <EnterUniProtID />
        )}

        {isoformSequences &&
        structureSequence &&
        selectedTranscript &&
        uniprotId ? (
          <>
            <TranscriptSelector
              val={userSelection ?? ''}
              setVal={setUserSelection}
              structureSequence={structureSequence}
              feature={feature}
              isoforms={options}
              isoformSequences={isoformSequences}
            />
            <AlphaFoldDBSearchStatus
              uniprotId={uniprotId}
              selectedTranscript={selectedTranscript}
              structureSequence={structureSequence}
              isoformSequences={isoformSequences}
            />
          </>
        ) : null}
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
          disabled={
            !uniprotId || !userSelectedProteinSequence || !selectedTranscript
          }
          onClick={() => {
            session.addView('ProteinView', {
              type: 'ProteinView',
              isFloating: true,
              structures: [
                {
                  url,
                  userProvidedTranscriptSequence:
                    userSelectedProteinSequence?.seq,
                  feature: selectedTranscript?.toJSON(),
                  connectedViewId: view.id,
                },
              ],
              displayName: [
                'Protein view',
                uniprotId,
                getGeneDisplayName(feature),
                getTranscriptDisplayName(selectedTranscript),
              ].join(' - '),
            })
            handleClose()
          }}
        >
          Launch 3-D protein structure view
        </Button>
        <Button
          variant="contained"
          disabled={
            !uniprotId || !userSelectedProteinSequence || !selectedTranscript
          }
          onClick={() => {
            if (uniprotId && isSessionWithAddTracks(session)) {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              ;(async () => {
                try {
                  await launchProteinAnnotationView({
                    session,
                    selectedTranscript,
                    feature,
                    uniprotId,
                  })
                } catch (e) {
                  console.error(e)
                  session.notifyError(`${e}`, e)
                }
              })()
            }
            handleClose()
          }}
        >
          Launch 1-D protein annotation view
        </Button>
      </DialogActions>
    </>
  )
})

export default AlphaFoldDBSearch
