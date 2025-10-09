import React from 'react'

import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material'

import ExternalLink from '../../components/ExternalLink'

type LookupMode = 'auto' | 'manual'

interface UniProtIdInputProps {
  lookupMode: LookupMode
  onLookupModeChange: (mode: LookupMode) => void
  manualUniprotId: string
  onManualUniprotIdChange: (id: string) => void
  autoUniprotId?: string
  isLoading: boolean
}

function UniProtIDNotFoundMessage() {
  return (
    <div>
      UniProt ID not found. You can try manually searching on{' '}
      <a href="https://alphafold.ebi.ac.uk/" target="_blank" rel="noreferrer">
        AlphaFoldDB
      </a>{' '}
      for your gene. After visiting the above link, you can switch to "Open file
      manually" and paste in the mmCIF link
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
  isLoading,
}: UniProtIdInputProps) {
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

      {lookupMode === 'auto' ? (
        isLoading || autoUniprotId ? null : (
          <UniProtIDNotFoundMessage />
        )
      ) : (
        !manualUniprotId && <EnterUniProtID />
      )}
    </>
  )
}
