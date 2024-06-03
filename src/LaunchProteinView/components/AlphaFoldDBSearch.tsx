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
import TranscriptSelector from './TranscriptSelector'
import HelpButton from './HelpButton'

// hooks
import useMyGeneInfo from '../useMyGeneInfo'
import useAllSequences from '../useProteinSequences'
import { useCheckAlphaFoldDBExistence } from './useCheckAlphaFoldDBExistence'
import AlphaFoldDBSearchStatus from './AlphaFoldDBSearchStatus'

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
  const { seqs, error: error2 } = useAllSequences({ feature, view })
  const protein = seqs?.[userSelection ?? '']
  const { result: foundStructureId, error } = useMyGeneInfo({
    id: selectedTranscript ? getDisplayName(selectedTranscript) : '',
  })

  useEffect(() => {
    if (userSelection === undefined && seqs !== undefined) {
      setUserSelection(options.find(f => !!seqs[f.id()])?.id())
    }
  }, [options, userSelection, seqs])
  const {
    success,
    loading,
    error: error3,
  } = useCheckAlphaFoldDBExistence({
    foundStructureId,
  })

  const e = error || error2 || error3
  const url = `https://alphafold.ebi.ac.uk/files/AF-${foundStructureId}-F1-model_v4.cif`
  return (
    <>
      <DialogContent className={classes.dialogContent}>
        {e ? <ErrorMessage error={e} /> : null}
        <div>
          Look up AlphaFoldDB structure for given transcript <HelpButton />
        </div>
        {seqs ? (
          <>
            <TranscriptSelector
              val={userSelection ?? ''}
              setVal={setUserSelection}
              options={options}
              feature={feature}
              seqs={seqs}
            />
            {selectedTranscript ? (
              <AlphaFoldDBSearchStatus
                foundStructureId={foundStructureId}
                selectedTranscript={selectedTranscript}
                success={success}
                loading={loading}
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
