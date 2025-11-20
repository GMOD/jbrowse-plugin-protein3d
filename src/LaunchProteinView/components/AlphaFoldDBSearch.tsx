import React, { useEffect, useState } from 'react'

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
import useAlphaFoldData from './useAlphaFoldData'
import useIsoformProteinSequences from './useIsoformProteinSequences'
import useLoadingStatuses from './useLoadingStatuses'
import useLookupUniProtId, {
  lookupUniProtIdViaMyGeneInfo,
} from './useLookupUniProtId'
import {
  getDisplayName,
  getId,
  getTranscriptFeatures,
  getUniprotIdFromFeature,
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
  selectorsRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
})

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
  const view = getContainingView(model) as LinearGenomeViewModel

  // State for UniProt ID lookup
  const [lookupMode, setLookupMode] = useState<'auto' | 'manual'>('auto')
  const [manualUniprotId, setManualUniprotId] = useState<string>('')
  // hardcoded right now
  const useApiSearch = false

  // Transcript selection
  const options = getTranscriptFeatures(feature)
  const [userSelection, setUserSelection] = useState<string>()
  const selectedTranscript = options.find(val => getId(val) === userSelection)

  // Load isoform sequences
  const {
    isoformSequences,
    isLoading: isIsoformProteinSequencesLoading,
    error: isoformProteinSequencesError,
  } = useIsoformProteinSequences({ feature, view })

  const userSelectedProteinSequence = isoformSequences?.[userSelection ?? '']

  // Check for UniProt ID from feature attributes
  const featureUniprotId = getUniprotIdFromFeature(
    selectedTranscript ?? feature,
  )

  // Auto-lookup UniProt ID
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

  const uniprotId = lookupMode === 'auto' ? autoUniprotId : manualUniprotId

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
    if (isoformSequences !== undefined) {
      const matchingTranscript =
        options.find(
          f =>
            isoformSequences[f.id()]?.seq.replaceAll('*', '') ===
            structureSequence,
        ) ?? options.find(f => !!isoformSequences[f.id()])
      setUserSelection(matchingTranscript?.id())
    }
  }, [options, structureSequence, isoformSequences])

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
        />
      </DialogActions>
    </>
  )
})

export default AlphaFoldDBSearch
