import React from 'react'
import { MenuItem, TextField, TextFieldProps } from '@mui/material'
import { Feature } from '@jbrowse/core/util'

// locals
import { getGeneDisplayName, getTranscriptDisplayName } from '../util'

function TextField2({ children, ...rest }: TextFieldProps) {
  return (
    <div>
      <TextField {...rest}>{children}</TextField>
    </div>
  )
}

export default function TranscriptSelector({
  val,
  setVal,
  options,
  feature,
  seqs,
}: {
  options: Feature[]
  feature: Feature
  val: string
  setVal: (str: string) => void
  seqs: Record<string, string>
}) {
  return (
    <TextField2
      value={val}
      onChange={event => setVal(event.target.value)}
      label="Choose transcript isoform"
      select
    >
      {options
        .filter(f => !!seqs[f.id()])
        .map(f => (
          <MenuItem value={f.id()} key={f.id()}>
            {getGeneDisplayName(feature)} - {getTranscriptDisplayName(f)} (
            {seqs[f.id()].length}aa)
          </MenuItem>
        ))}
      {options
        .filter(f => !seqs[f.id()])
        .map(f => (
          <MenuItem value={f.id()} key={f.id()} disabled>
            {getGeneDisplayName(feature)} - {getTranscriptDisplayName(f)} (no
            data)
          </MenuItem>
        ))}
    </TextField2>
  )
}
