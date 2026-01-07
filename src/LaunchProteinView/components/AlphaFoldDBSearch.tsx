import React, { useEffect, useMemo, useState } from 'react'

import { ErrorMessage, LoadingEllipses } from '@jbrowse/core/ui'
import { getContainingView, getSession } from '@jbrowse/core/util'
import { DialogActions, DialogContent } from '@mui/material'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'

import AlphaFoldDBSearchStatus from './AlphaFoldDBSearchStatus'
import AlphaFoldEntrySelector from './AlphaFoldEntrySelector'
import ProteinViewActions from './ProteinViewActions'
import SequenceSearchStatus from './SequenceSearchStatus'
import TranscriptSelector from './TranscriptSelector'
import UniProtIdInput from './UniProtIdInput'
import UniProtResultsTable from './UniProtResultsTable'
import { AlignmentAlgorithm } from '../../ProteinView/types'
import useAlphaFoldData from '../hooks/useAlphaFoldData'
import useAlphaFoldSequenceSearch from '../hooks/useAlphaFoldSequenceSearch'
import useIsoformProteinSequences from '../hooks/useIsoformProteinSequences'
import useLoadingStatuses from '../hooks/useLoadingStatuses'
import useUniProtSearch from '../hooks/useUniProtSearch'
import {
  getDisplayName,
  getId,
  getTranscriptFeatures,
  getUniProtIdFromFeature,
  selectBestTranscript,
} from '../utils/util'

import type { LookupMode } from './UniProtIdInput'
import type { SequenceSearchType } from '../hooks/useAlphaFoldSequenceSearch'
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
  const [lookupMode, setLookupMode] = useState<LookupMode>('auto')
  const [manualUniprotId, setManualUniprotId] = useState<string>('')
  const [selectedUniprotId, setSelectedUniprotId] = useState<string>()
  const [sequenceSearchType, setSequenceSearchType] =
    useState<SequenceSearchType>('md5')

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

  // Search UniProt for entries matching the transcript
  // Wait for transcript selection to stabilize before searching
  const transcriptId = selectedTranscript
    ? getDisplayName(selectedTranscript)
    : undefined

  // Get gene ID and gene name from feature
  const geneId = feature.get('gene_id') ?? feature.get('ID')
  const geneName = feature.get('gene_name') ?? feature.get('name') ?? feature.get('Name')

  console.log('[AlphaFoldDBSearch] lookupMode:', lookupMode)
  console.log('[AlphaFoldDBSearch] featureUniprotId:', featureUniprotId)
  console.log('[AlphaFoldDBSearch] transcriptId:', transcriptId)
  console.log('[AlphaFoldDBSearch] geneId:', geneId)
  console.log('[AlphaFoldDBSearch] geneName:', geneName)
  console.log('[AlphaFoldDBSearch] selectedTranscript:', selectedTranscript?.id())

  // Search by gene ID and gene name
  // Gene name search is important because some Swiss-Prot entries aren't linked via Ensembl xrefs
  const {
    entries: uniprotEntries,
    isLoading: isLookupLoading,
    error: lookupError,
  } = useUniProtSearch({
    geneId,
    geneName,
    enabled: lookupMode === 'auto' && !featureUniprotId,
  })

  console.log('[AlphaFoldDBSearch] uniprotEntries:', uniprotEntries)
  console.log('[AlphaFoldDBSearch] isLookupLoading:', isLookupLoading)

  // Auto-select first UniProt entry when results load
  const autoUniprotId = uniprotEntries[0]?.accession
  console.log('[AlphaFoldDBSearch] autoUniprotId:', autoUniprotId)

  // AlphaFoldDB sequence search
  const {
    uniprotId: sequenceSearchUniprotId,
    cifUrl: sequenceSearchCifUrl,
    plddtDocUrl: sequenceSearchPlddtUrl,
    structureSequence: sequenceSearchStructureSequence,
    isLoading: isSequenceSearchLoading,
    error: sequenceSearchError,
  } = useAlphaFoldSequenceSearch({
    sequence: userSelectedProteinSequence?.seq,
    searchType: sequenceSearchType,
    enabled: lookupMode === 'sequence',
  })

  const uniprotId =
    lookupMode === 'feature'
      ? featureUniprotId
      : lookupMode === 'auto'
        ? selectedUniprotId ?? autoUniprotId
        : lookupMode === 'sequence'
          ? sequenceSearchUniprotId
          : manualUniprotId

  // Auto-select 'feature' mode if a feature UniProt ID is found
  useEffect(() => {
    if (featureUniprotId && lookupMode === 'auto') {
      setLookupMode('feature')
    }
  }, [featureUniprotId, lookupMode])

  // AlphaFold data and selection (skip if using sequence search which provides direct URLs)
  const {
    predictions,
    isLoading: isAlphaFoldUrlLoading,
    error: alphaFoldUrlError,
    selectedEntryIndex,
    setSelectedEntryIndex,
    url: alphaFoldUrl,
    confidenceUrl: alphaFoldConfidenceUrl,
    structureSequence: alphaFoldStructureSequence,
  } = useAlphaFoldData({
    uniprotId: lookupMode === 'sequence' ? undefined : uniprotId,
  })

  // Use sequence search URLs/sequence when in sequence mode, otherwise use AlphaFold data
  const url = lookupMode === 'sequence' ? sequenceSearchCifUrl : alphaFoldUrl
  const confidenceUrl =
    lookupMode === 'sequence' ? sequenceSearchPlddtUrl : alphaFoldConfidenceUrl
  const structureSequence =
    lookupMode === 'sequence'
      ? sequenceSearchStructureSequence
      : alphaFoldStructureSequence

  // Aggregate errors and loading statuses
  const error =
    lookupError ??
    isoformProteinSequencesError ??
    alphaFoldUrlError ??
    sequenceSearchError
  const loadingStatuses = useLoadingStatuses({
    isLookupLoading,
    isIsoformProteinSequencesLoading,
    isAlphaFoldUrlLoading:
      lookupMode === 'sequence' ? false : isAlphaFoldUrlLoading,
    isSequenceSearchLoading:
      lookupMode === 'sequence' ? isSequenceSearchLoading : false,
  })

  // Auto-select transcript based on structure sequence match
  useEffect(() => {
    if (isoformSequences !== undefined && userSelection === undefined) {
      console.log('[AlphaFoldDBSearch] Auto-selecting transcript...')
      console.log('[AlphaFoldDBSearch] options:', options.map(o => ({ id: o.id(), name: getDisplayName(o) })))
      console.log('[AlphaFoldDBSearch] isoformSequences keys:', Object.keys(isoformSequences))
      console.log('[AlphaFoldDBSearch] isoformSequences with lengths:', Object.entries(isoformSequences).map(([k, v]) => ({ key: k, len: v.seq.length, name: getDisplayName(v.feature) })))
      console.log('[AlphaFoldDBSearch] structureSequence:', structureSequence?.slice(0, 50))
      const best = selectBestTranscript({
        options,
        isoformSequences,
        structureSequence,
      })
      console.log('[AlphaFoldDBSearch] selected best:', best?.id(), getDisplayName(best!))
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
          transcriptId={
            selectedTranscript
              ? getDisplayName(selectedTranscript)
              : getDisplayName(feature)
          }
          isLoading={isLookupLoading}
          hasProteinSequence={!!userSelectedProteinSequence?.seq}
          sequenceSearchType={sequenceSearchType}
          onSequenceSearchTypeChange={setSequenceSearchType}
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
          lookupMode === 'auto' &&
          !featureUniprotId &&
          (uniprotEntries.length > 0 || isLookupLoading) && (
            <UniProtResultsTable
              entries={uniprotEntries}
              selectedAccession={selectedUniprotId ?? autoUniprotId}
              onSelect={setSelectedUniprotId}
            />
          )}

        {isoformSequences &&
        selectedTranscript &&
        (lookupMode === 'sequence' || (structureSequence && uniprotId)) ? (
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
