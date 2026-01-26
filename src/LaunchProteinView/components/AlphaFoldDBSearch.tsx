import React, { useEffect, useMemo, useState } from 'react'

import { ErrorMessage, LoadingEllipses } from '@jbrowse/core/ui'
import { getContainingView, getSession } from '@jbrowse/core/util'
import { DialogActions, DialogContent, Typography } from '@mui/material'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'

import AlphaFoldDBSearchStatus from './AlphaFoldDBSearchStatus'
import AlphaFoldEntrySelector from './AlphaFoldEntrySelector'
import IdentifierSelector from './IdentifierSelector'
import ProteinViewActions from './ProteinViewActions'
import SequenceSearchStatus from './SequenceSearchStatus'
import TranscriptSelector from './TranscriptSelector'
import UniProtIdInput from './UniProtIdInput'
import UniProtResultsTable from './UniProtResultsTable'
import { AlignmentAlgorithm } from '../../ProteinView/types'
import ExternalLink from '../../components/ExternalLink'
import useFeatureIdentifiers from '../hooks/useFeatureIdentifiers'
import useIsoformProteinSequences from '../hooks/useIsoformProteinSequences'
import useLoadingStatuses from '../hooks/useLoadingStatuses'
import useStructureResolution from '../hooks/useStructureResolution'
import useUniProtSearch from '../hooks/useUniProtSearch'
import getSearchDescription from '../utils/getSearchDescription'
import {
  getId,
  getTranscriptFeatures,
  selectBestTranscript,
} from '../utils/util'

import type { LookupMode } from './UniProtIdInput'
import type { SequenceSearchType } from '../hooks/useAlphaFoldSequenceSearch'
import type { AbstractTrackModel, Feature } from '@jbrowse/core/util'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

const useStyles = makeStyles()({
  dialogContent: {
    width: '80em',
    '& > *': {
      marginBottom: 20,
    },
    '& > *:last-child': {
      marginBottom: 0,
    },
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

  const [lookupMode, setLookupMode] = useState<LookupMode>('auto')
  const [manualUniprotId, setManualUniprotId] = useState('')
  const [selectedQueryId, setSelectedQueryId] = useState('auto')
  const [sequenceSearchType, setSequenceSearchType] =
    useState<SequenceSearchType>('md5')
  const [selectedUniprotId, setSelectedUniprotId] = useState<string>()
  const [userSelection, setUserSelection] = useState<string>()

  const options = useMemo(() => getTranscriptFeatures(feature), [feature])
  const selectedTranscript = options.find(val => getId(val) === userSelection)

  const {
    isoformSequences,
    isLoading: isIsoformLoading,
    error: isoformError,
  } = useIsoformProteinSequences({ feature, view })

  const { recognizedIds, geneName, geneId, featureUniprotId } =
    useFeatureIdentifiers(feature, selectedTranscript)

  const {
    entries: uniprotEntries,
    isLoading: isLookupLoading,
    error: lookupError,
  } = useUniProtSearch({
    recognizedIds,
    geneId,
    geneName,
    selectedQueryId,
    enabled: lookupMode === 'auto' && !featureUniprotId,
  })

  const autoUniprotId = uniprotEntries[0]?.accession
  const userSelectedProteinSequence = isoformSequences?.[userSelection ?? '']

  const {
    url,
    confidenceUrl,
    structureSequence,
    uniprotIdFromSequenceSearch,
    predictions,
    selectedEntryIndex,
    setSelectedEntryIndex,
    isAlphaFoldLoading,
    isSequenceSearchLoading,
    alphaFoldError,
    sequenceSearchError,
  } = useStructureResolution({
    lookupMode,
    uniprotIdForAlphaFold:
      lookupMode === 'feature'
        ? featureUniprotId
        : lookupMode === 'auto'
          ? (selectedUniprotId ?? autoUniprotId)
          : lookupMode === 'manual'
            ? manualUniprotId
            : undefined,
    proteinSequence: userSelectedProteinSequence?.seq,
    sequenceSearchType,
  })

  const uniprotId =
    lookupMode === 'feature'
      ? featureUniprotId
      : lookupMode === 'auto'
        ? (selectedUniprotId ?? autoUniprotId)
        : lookupMode === 'sequence'
          ? uniprotIdFromSequenceSearch
          : manualUniprotId

  // Auto-select 'feature' mode if a feature UniProt ID is found
  useEffect(() => {
    if (featureUniprotId && lookupMode === 'auto') {
      setLookupMode('feature')
    }
  }, [featureUniprotId, lookupMode])

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

  const error = lookupError ?? isoformError ?? alphaFoldError ?? sequenceSearchError
  const loadingStatuses = useLoadingStatuses({
    isLookupLoading,
    isIsoformProteinSequencesLoading: isIsoformLoading,
    isAlphaFoldUrlLoading: isAlphaFoldLoading,
    isSequenceSearchLoading,
  })

  const showAutoSearchResults =
    isoformSequences && lookupMode === 'auto' && !featureUniprotId

  const showStructureSelectors =
    isoformSequences &&
    selectedTranscript &&
    (lookupMode === 'sequence' || (structureSequence && uniprotId))

  return (
    <>
      <DialogContent className={classes.dialogContent}>
        {error ? <ErrorMessage error={error} /> : null}

        <UniProtIdInput
          lookupMode={lookupMode}
          onLookupModeChange={setLookupMode}
          manualUniprotId={manualUniprotId}
          onManualUniprotIdChange={setManualUniprotId}
          featureUniprotId={featureUniprotId}
          hasProteinSequence={!!userSelectedProteinSequence?.seq}
          sequenceSearchType={sequenceSearchType}
          onSequenceSearchTypeChange={setSequenceSearchType}
        />

        {lookupMode === 'auto' &&
          !featureUniprotId &&
          (recognizedIds.length > 0 || geneName) && (
            <IdentifierSelector
              recognizedIds={recognizedIds}
              geneName={geneName}
              selectedId={selectedQueryId}
              onSelectedIdChange={setSelectedQueryId}
            />
          )}

        {loadingStatuses.map(status => (
          <LoadingEllipses key={status} variant="subtitle2" message={status} />
        ))}

        {showAutoSearchResults && (uniprotEntries.length > 0 || isLookupLoading) && (
          <>
            <Typography variant="body2" color="textSecondary">
              Searched UniProt by{' '}
              {getSearchDescription({ selectedQueryId, recognizedIds, geneName })}
            </Typography>
            <UniProtResultsTable
              entries={uniprotEntries}
              selectedAccession={selectedUniprotId ?? autoUniprotId}
              onSelect={setSelectedUniprotId}
            />
            <Typography variant="body2" color="textSecondary">
              If you don't see the entry you're looking for, try a different
              identifier above or search{' '}
              <ExternalLink href="https://www.uniprot.org/">UniProt</ExternalLink>{' '}
              directly and use "Enter manually".
            </Typography>
          </>
        )}

        {showAutoSearchResults && !isLookupLoading && uniprotEntries.length === 0 && (
          <Typography variant="body2" color="textSecondary">
            No UniProt entries found for{' '}
            {getSearchDescription({ selectedQueryId, recognizedIds, geneName, joinWord: 'or' })}
            . Try a different identifier above, or search{' '}
            <ExternalLink href="https://www.uniprot.org/">UniProt</ExternalLink>{' '}
            directly and use "Enter manually" above, or use "Search sequence
            against AlphaFoldDB API" if available.
          </Typography>
        )}

        {showStructureSelectors && (
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
              {predictions && lookupMode !== 'sequence' && (
                <AlphaFoldEntrySelector
                  predictions={predictions}
                  selectedEntryIndex={selectedEntryIndex}
                  onSelectionChange={setSelectedEntryIndex}
                />
              )}
            </div>
            {lookupMode === 'sequence' && (
              <SequenceSearchStatus
                isLoading={isSequenceSearchLoading}
                uniprotId={uniprotId}
                url={url}
                hasProteinSequence={!!userSelectedProteinSequence}
                sequenceSearchType={sequenceSearchType}
              />
            )}
            {structureSequence && uniprotId && lookupMode !== 'sequence' && (
              <AlphaFoldDBSearchStatus
                uniprotId={uniprotId}
                selectedTranscript={selectedTranscript}
                structureSequence={structureSequence}
                isoformSequences={isoformSequences}
                url={url}
              />
            )}
          </>
        )}
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
            userSelectedProteinSequence?.seq.replaceAll('*', '') === structureSequence
          }
        />
      </DialogActions>
    </>
  )
})

export default AlphaFoldDBSearch
