import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react'
import { Button, DialogActions, DialogContent, Typography } from '@mui/material'
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
  getDisplayName,
  getGeneDisplayName,
  getId,
  getTranscriptDisplayName,
  getTranscriptFeatures,
} from './util'

// components
import TranscriptSelector from './TranscriptSelector'
import HelpButton from './HelpButton'
import AlphaFoldDBSearchStatus from './AlphaFoldDBSearchStatus'

// hooks
import useMyGeneInfoUniprotIdLookup from './useMyGeneInfoUniprotIdLookup'
import useRemoteStructureFileSequence from './useRemoteStructureFileSequence'
import useIsoformProteinSequences from './useIsoformProteinSequences'

const useStyles = makeStyles()(theme => ({
  dialogContent: {
    marginTop: theme.spacing(6),
    width: '80em',
  },
}))

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
    uniprotId,
    isLoading: isMyGeneLoading,
    error: myGeneError,
  } = useMyGeneInfoUniprotIdLookup({
    id: selectedTranscript
      ? getDisplayName(selectedTranscript)
      : getDisplayName(feature),
  })

  const url = uniprotId
    ? `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v4.cif`
    : undefined
  const {
    seq: structureSequence,
    isLoading: isRemoteStructureSequenceLoading,
    error: remoteStructureSequenceError,
  } = useRemoteStructureFileSequence({ url })
  const e =
    myGeneError || isoformProteinSequencesError || remoteStructureSequenceError

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

  return (
    <>
      <DialogContent className={classes.dialogContent}>
        {e ? <ErrorMessage error={e} /> : null}
        <Typography>
          Automatically find AlphaFoldDB entry for given transcript{' '}
          <HelpButton />
        </Typography>
        {isRemoteStructureSequenceLoading ? (
          <LoadingEllipses
            variant="h6"
            message="Loading sequence from remote structure file"
          />
        ) : null}
        {isMyGeneLoading ? (
          <LoadingEllipses
            variant="h6"
            message="Looking up UniProt ID from mygene.info"
          />
        ) : (uniprotId ? null : (
          <div>
            UniProt ID not found. Search sequence on AlphaFoldDB{' '}
            <a
              href={`https://alphafold.ebi.ac.uk/search/sequence/${userSelectedProteinSequence?.seq.replaceAll('*', '')}`}
              target="_blank"
              rel="noreferrer"
            >
              here
            </a>{' '}
            <br />
            After visiting the above link, then paste the structure URL into the
            Manual tab
          </div>
        ))}
        {isIsoformProteinSequencesLoading ? (
          <LoadingEllipses
            variant="h6"
            message="Loading protein sequences from transcript isoforms"
          />
        ) : null}
        {isoformSequences && structureSequence && selectedTranscript ? (
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
              url,
              seq2: userSelectedProteinSequence?.seq,
              feature: selectedTranscript?.toJSON(),
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

export default AlphaFoldDBSearch
