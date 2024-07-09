import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react'
import { Button, DialogActions, DialogContent } from '@mui/material'
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
} from '../util'

// components
import TranscriptSelector from './TranscriptSelector'
import HelpButton from './HelpButton'
import AlphaFoldDBSearchStatus from './AlphaFoldDBSearchStatus'

// hooks
import useMyGeneInfo from '../useMyGeneInfo'
import useRemoteStructureFileSequence from './useRemoteStructureFileSequence'
import useIsoformProteinSequences from '../useIsoformProteinSequences'

const useStyles = makeStyles()(theme => ({
  dialogContent: {
    marginTop: theme.spacing(6),
    width: '80em',
  },
}))

type LGV = LinearGenomeViewModel

const AlphaFoldDBSearch = observer(function AlphaFoldDBSearch({
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
  const view = getContainingView(model) as LGV
  const selectedTranscript = options.find(val => getId(val) === userSelection)
  const { isoformSequences, error: error2 } = useIsoformProteinSequences({
    feature,
    view,
  })
  const protein = isoformSequences?.[userSelection ?? '']
  const { result: foundStructureId, error } = useMyGeneInfo({
    id: selectedTranscript ? getDisplayName(selectedTranscript) : '',
  })

  useEffect(() => {
    if (userSelection === undefined && isoformSequences !== undefined) {
      setUserSelection(options.find(f => !!isoformSequences[f.id()])?.id())
    }
  }, [options, userSelection, isoformSequences])

  const url = foundStructureId
    ? `https://alphafold.ebi.ac.uk/files/AF-${foundStructureId}-F1-model_v4.cif`
    : undefined
  const {
    seq: structureSequence,
    isLoading,
    error: error3,
  } = useRemoteStructureFileSequence({ url })
  const e = error || error2 || error3

  return (
    <>
      <DialogContent className={classes.dialogContent}>
        {e ? <ErrorMessage error={e} /> : null}
        <div>
          Look up AlphaFoldDB structure for given transcript <HelpButton />
        </div>
        {isoformSequences && structureSequence ? (
          <>
            <TranscriptSelector
              val={userSelection ?? ''}
              setVal={setUserSelection}
              structureSequence={structureSequence}
              feature={feature}
              isoforms={options}
              isoformSequences={isoformSequences}
            />
            {selectedTranscript ? (
              <AlphaFoldDBSearchStatus
                foundStructureId={foundStructureId}
                selectedTranscript={selectedTranscript}
                structureSequence={structureSequence}
                isLoading={isLoading}
                isoformSequences={isoformSequences}
              />
            ) : null}
          </>
        ) : (
          <div style={{ margin: 20 }}>
            <LoadingEllipses message="Loading protein sequences" variant="h6" />
          </div>
        )}
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
          disabled={!foundStructureId || !protein || !selectedTranscript}
          onClick={() => {
            session.addView('ProteinView', {
              type: 'ProteinView',
              url,
              seq2: protein,
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
