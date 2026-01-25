import React from 'react'

import {
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import { makeStyles } from 'tss-react/mui'

import { getDatabaseTypeForId } from '../utils/util'

const useStyles = makeStyles()({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  chipContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
})

interface IdentifierSelectorProps {
  recognizedIds: string[]
  geneName?: string
  selectedId: string
  onSelectedIdChange: (id: string) => void
}

function getIdLabel(id: string): string {
  const dbType = getDatabaseTypeForId(id)
  if (dbType === 'refseq') {
    if (id.startsWith('NM_') || id.startsWith('XM_')) {
      return `${id} (RefSeq mRNA)`
    }
    if (id.startsWith('NR_') || id.startsWith('XR_')) {
      return `${id} (RefSeq ncRNA)`
    }
    if (id.startsWith('NP_') || id.startsWith('XP_')) {
      return `${id} (RefSeq protein)`
    }
    return `${id} (RefSeq)`
  }
  if (dbType === 'ensembl') {
    if (id.includes('G')) {
      return `${id} (Ensembl gene)`
    }
    if (id.includes('T')) {
      return `${id} (Ensembl transcript)`
    }
    if (id.includes('P')) {
      return `${id} (Ensembl protein)`
    }
    return `${id} (Ensembl)`
  }
  if (dbType === 'hgnc') {
    return `${id} (HGNC)`
  }
  if (dbType === 'ccds') {
    return `${id} (CCDS)`
  }
  return id
}

export default function IdentifierSelector({
  recognizedIds,
  geneName,
  selectedId,
  onSelectedIdChange,
}: IdentifierSelectorProps) {
  const { classes } = useStyles()

  // Build list of selectable options
  const options: { value: string; label: string }[] = [
    { value: 'auto', label: 'Auto (try all)' },
    ...recognizedIds.map(id => ({ value: id, label: getIdLabel(id) })),
  ]

  if (geneName) {
    options.push({ value: `gene:${geneName}`, label: `${geneName} (gene name)` })
  }

  if (recognizedIds.length === 0 && !geneName) {
    return (
      <Typography variant="body2" color="text.secondary">
        No recognized database identifiers found in feature attributes.
      </Typography>
    )
  }

  return (
    <div className={classes.container}>
      <FormControl size="small" sx={{ minWidth: 300 }}>
        <InputLabel>Query UniProt by</InputLabel>
        <Select
          value={selectedId}
          label="Query UniProt by"
          onChange={e => {
            onSelectedIdChange(e.target.value)
          }}
        >
          {options.map(opt => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {recognizedIds.length > 0 && (
        <div className={classes.chipContainer}>
          <Typography variant="caption" color="text.secondary">
            Found:
          </Typography>
          {recognizedIds.slice(0, 5).map(id => (
            <Chip
              key={id}
              label={id}
              size="small"
              variant="outlined"
              onClick={() => {
                onSelectedIdChange(id)
              }}
            />
          ))}
          {recognizedIds.length > 5 && (
            <Typography variant="caption" color="text.secondary">
              +{recognizedIds.length - 5} more
            </Typography>
          )}
        </div>
      )}
    </div>
  )
}
