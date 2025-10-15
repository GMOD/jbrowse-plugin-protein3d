import React from 'react'
import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
} from '@mui/material'
import { makeStyles } from 'tss-react/mui'

const useStyles = makeStyles()({
  formControl: {
    display: 'block',
  },
})

export default function AlphaFoldModeSelector({
  useApiSearch,
  onChange,
  disabled,
}: {
  useApiSearch: boolean
  onChange: (useApi: boolean) => void
  disabled?: boolean
}) {
  const { classes } = useStyles()
  return (
    <FormControl className={classes.formControl} disabled={disabled}>
      <FormLabel>AlphaFold Lookup Mode</FormLabel>
      <RadioGroup
        value={useApiSearch ? 'api' : 'direct'}
        onChange={e => onChange(e.target.value === 'api')}
      >
        <FormControlLabel
          value="direct"
          control={<Radio />}
          label="Direct structure lookup (faster)"
        />
        <FormControlLabel
          value="api"
          control={<Radio />}
          label="Automatic UniProt ID lookup (w/ alternate isoforms)"
        />
      </RadioGroup>
    </FormControl>
  )
}
