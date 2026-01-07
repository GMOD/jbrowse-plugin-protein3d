import React, { useEffect, useMemo, useState } from 'react'

import { ErrorMessage, LoadingEllipses } from '@jbrowse/core/ui'
import { getContainingView, getSession } from '@jbrowse/core/util'
import { Button, DialogActions, DialogContent, TextField } from '@mui/material'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'

import FoldseekDatabaseSelector from './FoldseekDatabaseSelector'
import FoldseekResultsTable from './FoldseekResultsTable'
import TranscriptSelector from './TranscriptSelector'
import useFoldseekSearch from '../hooks/useFoldseekSearch'
import useIsoformProteinSequences from '../hooks/useIsoformProteinSequences'
import {
  DEFAULT_DATABASES,
  type FoldseekDatabaseId,
} from '../services/foldseekApi'
import { getTranscriptFeatures } from '../utils/util'

import type { AbstractTrackModel, Feature } from '@jbrowse/core/util'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

const useStyles = makeStyles()({
  dialogContent: {
    width: '80em',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  sequenceInput: {
    fontFamily: 'monospace',
  },
})

const FoldseekSearch = observer(function FoldseekSearch({
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
  const view = getContainingView(model) as LinearGenomeViewModel

  const [sequence, setSequence] = useState('')
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string>('')
  const [selectedDatabases, setSelectedDatabases] =
    useState<FoldseekDatabaseId[]>(DEFAULT_DATABASES)

  const { results, isLoading, error, statusMessage, search, reset } =
    useFoldseekSearch()

  const transcripts = useMemo(() => getTranscriptFeatures(feature), [feature])

  const {
    isoformSequences,
    isLoading: isLoadingIsoforms,
    error: isoformError,
  } = useIsoformProteinSequences({ feature, view })

  const selectedTranscript = transcripts.find(
    t => t.id() === selectedTranscriptId,
  )
  const selectedIsoformData = isoformSequences?.[selectedTranscriptId]

  useEffect(() => {
    if (isoformSequences && !selectedTranscriptId) {
      const sortedTranscripts = [...transcripts].sort((a, b) => {
        const seqA = isoformSequences[a.id()]?.seq
        const seqB = isoformSequences[b.id()]?.seq
        return (seqB?.length ?? 0) - (seqA?.length ?? 0)
      })
      const firstWithSeq = sortedTranscripts.find(
        t => isoformSequences[t.id()]?.seq,
      )
      if (firstWithSeq) {
        setSelectedTranscriptId(firstWithSeq.id())
      }
    }
  }, [isoformSequences, selectedTranscriptId, transcripts])

  useEffect(() => {
    if (selectedIsoformData?.seq) {
      setSequence(selectedIsoformData.seq)
    }
  }, [selectedIsoformData])

  const handleSearch = () => {
    if (sequence.trim() && selectedDatabases.length > 0) {
      search(sequence.trim(), selectedDatabases)
    }
  }

  const handleLoadStructure = (url: string, target: string) => {
    session.addView('ProteinView', {
      type: 'ProteinView',
      isFloating: true,
      structures: [
        {
          url,
          userProvidedTranscriptSequence: sequence.replace(/^>.*\n/, ''),
          feature: selectedTranscript?.toJSON(),
          connectedViewId: view.id,
        },
      ],
      displayName: `Protein view - ${target}`,
    })
    handleClose()
  }

  const canSearch =
    sequence.trim().length > 0 && selectedDatabases.length > 0 && !isLoading

  const combinedError = error || isoformError

  return (
    <>
      <DialogContent className={classes.dialogContent}>
        {combinedError ? <ErrorMessage error={combinedError} /> : null}

        {isLoadingIsoforms ? (
          <LoadingEllipses
            variant="subtitle2"
            message="Loading transcript sequences"
          />
        ) : null}

        {isoformSequences ? (
          <TranscriptSelector
            val={selectedTranscriptId}
            setVal={setSelectedTranscriptId}
            isoforms={transcripts}
            isoformSequences={isoformSequences}
            feature={feature}
            disabled={isLoading}
          />
        ) : null}

        <TextField
          label="Protein sequence (FASTA format or raw sequence)"
          multiline
          rows={6}
          value={sequence}
          onChange={e => setSequence(e.target.value)}
          placeholder={`>query\nMKTVRQERLKSIVRILERSKEPVSGAQLAEELSNL...`}
          disabled={isLoading}
          InputProps={{
            className: classes.sequenceInput,
          }}
        />

        <FoldseekDatabaseSelector
          selected={selectedDatabases}
          onChange={setSelectedDatabases}
          disabled={isLoading}
        />

        {isLoading && statusMessage ? (
          <LoadingEllipses variant="subtitle2" message={statusMessage} />
        ) : null}

        {results ? (
          <FoldseekResultsTable
            results={results}
            onLoadStructure={handleLoadStructure}
          />
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" color="secondary" onClick={handleClose}>
          Cancel
        </Button>
        {results ? (
          <Button variant="outlined" onClick={reset}>
            New search
          </Button>
        ) : null}
        <Button
          variant="contained"
          color="primary"
          disabled={!canSearch}
          onClick={handleSearch}
        >
          {isLoading ? 'Searching...' : 'Search Foldseek'}
        </Button>
      </DialogActions>
    </>
  )
})

export default FoldseekSearch
