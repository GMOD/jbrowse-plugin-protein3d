import React, { useEffect, useMemo, useState } from 'react'

import { ErrorMessage, LoadingEllipses } from '@jbrowse/core/ui'
import { getContainingView, getSession } from '@jbrowse/core/util'
import { DialogActions, DialogContent } from '@mui/material'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'

import AlphaFoldDBSearchStatus from './AlphaFoldDBSearchStatus'
import AlphaFoldEntrySelector from './AlphaFoldEntrySelector'
import ProteinViewActions from './ProteinViewActions'
import TranscriptSelector from './TranscriptSelector'
import UniProtIdInput from './UniProtIdInput'
import { AlignmentAlgorithm } from '../../ProteinView/types'
import useAlphaFoldData from '../hooks/useAlphaFoldData'
import useIsoformProteinSequences from '../hooks/useIsoformProteinSequences'
import useLoadingStatuses from '../hooks/useLoadingStatuses'
import useLookupUniProtId, {
  lookupUniProtIdViaMyGeneInfo,
} from '../hooks/useLookupUniProtId'
import {
  getDisplayName,
  getId,
  getTranscriptFeatures,
  getUniProtIdFromFeature,
  selectBestTranscript,
} from '../utils/util'

import type { AbstractTrackModel, Feature } from '@jbrowse/core/util'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

const useStyles = makeStyles()({
  dialogContent: {
    width: '80em',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  selectorsRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
})

const AlphaFoldDBSearch = observer(function AlphaFoldDBSearch({
  feature,
  model,
  handleClose,
  alignmentAlgorithm,
  onAlignmentAlgorithmChange,
}: {
  feature: Feature
  model: AbstractTrackModel
  handleClose: () => void
  alignmentAlgorithm: AlignmentAlgorithm
  onAlignmentAlgorithmChange: (algorithm: AlignmentAlgorithm) => void
}) {
  const { classes } = useStyles()
  const session = getSession(model)
  const view = getContainingView(model) as LinearGenomeViewModel

  // State for UniProt ID lookup
  const [lookupMode, setLookupMode] = useState<'auto' | 'manual' | 'feature'>(
    'auto',
  )
  const [manualUniprotId, setManualUniprotId] = useState<string>('')
  // hardcoded right now
  const useApiSearch = false

  // Transcript selection
  const options = useMemo(() => getTranscriptFeatures(feature), [feature])
  const [userSelection, setUserSelection] = useState<string>()
  const selectedTranscript = options.find(val => getId(val) === userSelection)

  // Load isoform sequences
  const {
    isoformSequences,
    isLoading: isIsoformProteinSequencesLoading,
    error: isoformProteinSequencesError,
  } = useIsoformProteinSequences({ feature, view })

  const userSelectedProteinSequence = isoformSequences?.[userSelection ?? '']

  // Check for UniProt ID from feature attributes (check transcript first, fall back to parent)
  const featureUniprotId =
    getUniProtIdFromFeature(selectedTranscript) ??
    getUniProtIdFromFeature(feature)

  // Auto-lookup UniProt ID (only when not using feature mode)
  const {
    uniprotId: autoUniprotId,
    isLoading: isLookupLoading,
    error: lookupError,
  } = useLookupUniProtId({
    id: selectedTranscript
      ? getDisplayName(selectedTranscript)
      : getDisplayName(feature),
    providedUniprotId: featureUniprotId,
    lookupMethod: lookupUniProtIdViaMyGeneInfo,
  })

  const uniprotId =
    lookupMode === 'feature'
      ? featureUniprotId
      : lookupMode === 'auto'
        ? autoUniprotId
        : manualUniprotId

  // Auto-select 'feature' mode if a feature UniProt ID is found
  useEffect(() => {
    if (featureUniprotId && lookupMode === 'auto') {
      setLookupMode('feature')
    }
  }, [featureUniprotId, lookupMode])

  // AlphaFold data and selection
  const {
    predictions,
    isLoading: isAlphaFoldUrlLoading,
    error: alphaFoldUrlError,
    selectedEntryIndex,
    setSelectedEntryIndex,
    url,
    confidenceUrl,
    structureSequence,
  } = useAlphaFoldData({ uniprotId, useApiSearch })

  // Aggregate errors and loading statuses
  const error = lookupError ?? isoformProteinSequencesError ?? alphaFoldUrlError
  const loadingStatuses = useLoadingStatuses({
    isLookupLoading,
    isIsoformProteinSequencesLoading,
    isAlphaFoldUrlLoading,
  })

  // Auto-select transcript based on structure sequence match
  useEffect(() => {
    if (isoformSequences !== undefined && userSelection === undefined) {
      const best = selectBestTranscript({
        options,
        isoformSequences,
        structureSequence,
      })
      setUserSelection(best?.id())
    }
  }, [options, structureSequence, isoformSequences, userSelection])

  return (
    <>
      <DialogContent className={classes.dialogContent}>
        {error ? <ErrorMessage error={error} /> : null}

        <UniProtIdInput
          lookupMode={lookupMode}
          onLookupModeChange={setLookupMode}
          manualUniprotId={manualUniprotId}
          onManualUniprotIdChange={setManualUniprotId}
          autoUniprotId={autoUniprotId}
          featureUniprotId={featureUniprotId}
          isLoading={isLookupLoading}
        />

        {loadingStatuses.length > 0 &&
          loadingStatuses.map(status => (
            <LoadingEllipses
              key={status}
              variant="subtitle2"
              message={status}
            />
          ))}

        {isoformSequences &&
        structureSequence &&
        selectedTranscript &&
        uniprotId ? (
          <>
            <div className={classes.selectorsRow}>
              <TranscriptSelector
                val={userSelection ?? ''}
                setVal={setUserSelection}
                structureSequence={structureSequence}
                feature={feature}
                isoforms={options}
                isoformSequences={isoformSequences}
              />
              {predictions && (
                <AlphaFoldEntrySelector
                  predictions={predictions}
                  selectedEntryIndex={selectedEntryIndex}
                  onSelectionChange={setSelectedEntryIndex}
                />
              )}
            </div>
            <AlphaFoldDBSearchStatus
              uniprotId={uniprotId}
              selectedTranscript={selectedTranscript}
              structureSequence={structureSequence}
              isoformSequences={isoformSequences}
              url={url}
            />
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <ProteinViewActions
          handleClose={handleClose}
          uniprotId={uniprotId}
          userSelectedProteinSequence={userSelectedProteinSequence}
          selectedTranscript={selectedTranscript}
          url={url}
          confidenceUrl={confidenceUrl}
          feature={feature}
          view={view}
          session={session}
          alignmentAlgorithm={alignmentAlgorithm}
          onAlignmentAlgorithmChange={onAlignmentAlgorithmChange}
          sequencesMatch={
            userSelectedProteinSequence?.seq.replaceAll('*', '') ===
            structureSequence
          }
        />
      </DialogActions>
    </>
  )
})

export default AlphaFoldDBSearch
