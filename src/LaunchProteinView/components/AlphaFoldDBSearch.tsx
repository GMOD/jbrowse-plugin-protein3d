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
import useAlphaFoldData from '../hooks/useAlphaFoldData'
import useAlphaFoldSequenceSearch from '../hooks/useAlphaFoldSequenceSearch'
import useIsoformProteinSequences from '../hooks/useIsoformProteinSequences'
import useLoadingStatuses from '../hooks/useLoadingStatuses'
import useUniProtSearch from '../hooks/useUniProtSearch'
import {
  extractFeatureIdentifiers,
  getId,
  getTranscriptFeatures,
  getUniProtIdFromFeature,
  selectBestTranscript,
} from '../utils/util'

import type { LookupMode } from './UniProtIdInput'
import type { SequenceSearchType } from '../hooks/useAlphaFoldSequenceSearch'
import type { AbstractTrackModel, Feature } from '@jbrowse/core/util'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

function getSearchDescription({
  selectedQueryId,
  recognizedIds,
  geneName,
  joinWord = 'and',
}: {
  selectedQueryId: string
  recognizedIds: string[]
  geneName?: string
  joinWord?: 'and' | 'or'
}) {
  if (selectedQueryId === 'auto') {
    return [
      recognizedIds.length > 0
        ? `database ID${recognizedIds.length > 1 ? 's' : ''} "${recognizedIds.join('", "')}"`
        : undefined,
      geneName ? `gene name "${geneName}"` : undefined,
    ]
      .filter(Boolean)
      .join(` ${joinWord} `)
  }
  if (selectedQueryId.startsWith('gene:')) {
    return `gene name "${selectedQueryId.replace('gene:', '')}"`
  }
  return `database ID "${selectedQueryId}"`
}

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

  // State for UniProt ID lookup
  const [lookupMode, setLookupMode] = useState<LookupMode>('auto')
  const [manualUniprotId, setManualUniprotId] = useState<string>('')
  const [selectedUniprotId, setSelectedUniprotId] = useState<string>()
  const [selectedQueryId, setSelectedQueryId] = useState<string>('auto')
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

  // Extract identifiers from both transcript and gene features
  // Prioritize recognized database IDs (Ensembl, RefSeq, CCDS, HGNC) over gene symbols
  const transcriptIds = useMemo(
    () => extractFeatureIdentifiers(selectedTranscript),
    [selectedTranscript],
  )
  const geneIds = useMemo(() => extractFeatureIdentifiers(feature), [feature])

  // Combine recognized IDs from both transcript and gene, transcript IDs first
  const recognizedIds = useMemo(
    () => [
      ...new Set([...transcriptIds.recognizedIds, ...geneIds.recognizedIds]),
    ],
    [transcriptIds.recognizedIds, geneIds.recognizedIds],
  )

  // Use gene name from either transcript or gene feature
  const geneName = transcriptIds.geneName ?? geneIds.geneName

  // Search UniProt using recognized database IDs (preferred) and gene name (fallback)
  const {
    entries: uniprotEntries,
    isLoading: isLookupLoading,
    error: lookupError,
  } = useUniProtSearch({
    recognizedIds,
    geneId: geneIds.geneId,
    geneName,
    selectedQueryId,
    enabled: lookupMode === 'auto' && !featureUniprotId,
  })

  // Auto-select first UniProt entry when results load
  const autoUniprotId = uniprotEntries[0]?.accession

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
        ? (selectedUniprotId ?? autoUniprotId)
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
            <>
              <Typography variant="body2" color="textSecondary">
                Searched UniProt by{' '}
                {getSearchDescription({
                  selectedQueryId,
                  recognizedIds,
                  geneName,
                })}
              </Typography>
              <UniProtResultsTable
                entries={uniprotEntries}
                selectedAccession={selectedUniprotId ?? autoUniprotId}
                onSelect={setSelectedUniprotId}
              />
              <Typography variant="body2" color="textSecondary">
                If you don't see the entry you're looking for, try a different
                identifier above or search{' '}
                <ExternalLink href="https://www.uniprot.org/">
                  UniProt
                </ExternalLink>{' '}
                directly and use "Enter manually".
              </Typography>
            </>
          )}

        {isoformSequences &&
          lookupMode === 'auto' &&
          !featureUniprotId &&
          !isLookupLoading &&
          uniprotEntries.length === 0 && (
            <Typography variant="body2" color="textSecondary">
              No UniProt entries found for{' '}
              {getSearchDescription({
                selectedQueryId,
                recognizedIds,
                geneName,
                joinWord: 'or',
              })}
              . Try a different identifier above, or search{' '}
              <ExternalLink href="https://www.uniprot.org/">
                UniProt
              </ExternalLink>{' '}
              directly and use "Enter manually" above, or use "Search sequence
              against AlphaFoldDB API" if available.
            </Typography>
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
