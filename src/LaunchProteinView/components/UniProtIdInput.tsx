import React from 'react'

import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material'

import ExternalLink from '../../components/ExternalLink'
import { isRecognizedTranscriptId } from '../services/lookupMethods'
import { stripTrailingVersion } from '../utils/util'

import type { SequenceSearchType } from '../hooks/useAlphaFoldSequenceSearch'

export type LookupMode = 'auto' | 'manual' | 'feature' | 'sequence'

interface UniProtIdInputProps {
  lookupMode: LookupMode
  onLookupModeChange: (mode: LookupMode) => void
  manualUniprotId: string
  onManualUniprotIdChange: (id: string) => void
  autoUniprotId?: string
  featureUniprotId?: string
  transcriptId?: string
  isLoading: boolean
  sequenceSearchType?: SequenceSearchType
  onSequenceSearchTypeChange?: (type: SequenceSearchType) => void
}

function UnrecognizedIdMessage() {
  return (
    <div>
      Automatic lookup only works for Ensembl (ENS...) or RefSeq (NM_, XM_,
      etc.) transcript IDs. Try the &quot;AlphaFoldDB sequence search&quot;
      option or the &quot;Foldseek search&quot; tab instead.
    </div>
  )
}

function UniProtIDNotFoundMessage() {
  return (
    <div>
      UniProt ID not found for this transcript. Try the &quot;AlphaFoldDB
      sequence search&quot; option or the &quot;Foldseek search&quot; tab
      instead.
    </div>
  )
}

function EnterUniProtID() {
  return (
    <div>
      Please enter a valid UniProt ID. You can search for UniProt IDs at{' '}
      <ExternalLink href="https://www.uniprot.org/">UniProt</ExternalLink> or{' '}
      <ExternalLink href="https://alphafold.ebi.ac.uk/">
        AlphaFoldDB
      </ExternalLink>
    </div>
  )
}

/**
 * Component to handle UniProt ID input (both automatic and manual modes)
 */
export default function UniProtIdInput({
  lookupMode,
  onLookupModeChange,
  manualUniprotId,
  onManualUniprotIdChange,
  autoUniprotId,
  featureUniprotId,
  transcriptId,
  isLoading,
  sequenceSearchType,
  onSequenceSearchTypeChange,
}: UniProtIdInputProps) {
  const strippedId = stripTrailingVersion(transcriptId)
  const isRecognized = strippedId ? isRecognizedTranscriptId(strippedId) : false
  return (
    <>
      <FormControl component="fieldset">
        <RadioGroup
          row
          value={lookupMode}
          onChange={event => {
            onLookupModeChange(event.target.value as LookupMode)
          }}
        >
          {featureUniprotId && (
            <FormControlLabel
              value="feature"
              control={<Radio />}
              label={`Use feature UniProt ID (${featureUniprotId})`}
            />
          )}
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
          <FormControlLabel
            value="sequence"
            control={<Radio />}
            label="AlphaFoldDB sequence search"
          />
        </RadioGroup>
      </FormControl>

      {lookupMode === 'manual' && (
        <div>
          <TextField
            label="UniProt ID"
            variant="outlined"
            placeholder="Enter UniProt ID (e.g. P68871)"
            helperText="Enter a valid UniProt ID to load the corresponding protein structure"
            value={manualUniprotId}
            onChange={e => {
              onManualUniprotIdChange(e.target.value)
            }}
          />
        </div>
      )}

      {lookupMode === 'sequence' &&
        sequenceSearchType &&
        onSequenceSearchTypeChange && (
          <>
            <FormControl component="fieldset">
              <RadioGroup
                row
                value={sequenceSearchType}
                onChange={event => {
                  onSequenceSearchTypeChange(
                    event.target.value as SequenceSearchType,
                  )
                }}
              >
                <FormControlLabel
                  value="md5"
                  control={<Radio />}
                  label="Exact match (faster)"
                />
                <FormControlLabel
                  value="sequence"
                  control={<Radio />}
                  label="Search by sequence"
                />
              </RadioGroup>
            </FormControl>
            <div>
              Note: This lookup may not return the canonical UniProt accession
              associated with your gene of interest. If you have questions about
              which structure to use, visit{' '}
              <ExternalLink href="https://alphafold.ebi.ac.uk/">
                AlphaFoldDB
              </ExternalLink>{' '}
              to look up the UniProt ID associated with your gene manually, and
              then use the "Manual UniProt" option
            </div>
          </>
        )}

      {lookupMode === 'auto' ? (
        isLoading || autoUniprotId ? null : !isRecognized ? (
          <UnrecognizedIdMessage />
        ) : (
          <UniProtIDNotFoundMessage />
        )
      ) : lookupMode === 'manual' ? (
        !manualUniprotId && <EnterUniProtID />
      ) : null}
    </>
  )
}
