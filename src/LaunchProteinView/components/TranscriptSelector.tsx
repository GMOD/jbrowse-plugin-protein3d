import React from 'react'
import { MenuItem, TextField, TextFieldProps } from '@mui/material'
import { Feature } from '@jbrowse/core/util'

// locals
import { getGeneDisplayName, getTranscriptDisplayName } from './util'

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
  isoforms,
  isoformSequences,
  structureSequence,
  feature,
}: {
  isoforms: Feature[]
  feature: Feature
  val: string
  setVal: (str: string) => void
  structureSequence: string
  isoformSequences: Record<string, { feature: Feature; seq: string }>
}) {
  return (
    <TextField2
      value={val}
      onChange={event => {
        setVal(event.target.value)
      }}
      label="Choose transcript isoform"
      select
    >
      {isoforms
        .filter(f => !!isoformSequences[f.id()])
        .filter(
          f =>
            isoformSequences[f.id()]!.seq.replaceAll('*', '') ===
            structureSequence,
        )
        .map(f => (
          <MenuItem value={f.id()} key={f.id()}>
            {getGeneDisplayName(feature)} - {getTranscriptDisplayName(f)} (
            {isoformSequences[f.id()]!.seq.length}aa) (matches structure
            residues)
          </MenuItem>
        ))}
      {isoforms
        .filter(f => !!isoformSequences[f.id()])
        .filter(
          f =>
            isoformSequences[f.id()]!.seq.replaceAll('*', '') !==
            structureSequence,
        )
        .sort(
          (a, b) =>
            isoformSequences[b.id()]!.seq.length -
            isoformSequences[a.id()]!.seq.length,
        )
        .map(f => (
          <MenuItem value={f.id()} key={f.id()}>
            {getGeneDisplayName(feature)} - {getTranscriptDisplayName(f)} (
            {isoformSequences[f.id()]!.seq.length}aa)
          </MenuItem>
        ))}
      {isoforms
        .filter(f => !isoformSequences[f.id()])
        .map(f => (
          <MenuItem value={f.id()} key={f.id()} disabled>
            {getGeneDisplayName(feature)} - {getTranscriptDisplayName(f)} (no
            data)
          </MenuItem>
        ))}
    </TextField2>
  )
}
