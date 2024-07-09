import React from 'react'
import { TextField } from '@mui/material'
import { Feature, max } from '@jbrowse/core/util'
import { makeStyles } from 'tss-react/mui'

// locals
import { getTranscriptDisplayName } from '../util'

const useStyles = makeStyles()({
  textAreaFont: {
    fontFamily: 'Courier New',
    whiteSpace: 'pre',
  },
})

export default function MSATable({
  structureName,
  structureSequence,
  isoformSequences,
}: {
  structureName: string
  structureSequence: string
  isoformSequences: Record<string, { feature: Feature; seq: string }>
}) {
  const { classes } = useStyles()
  const exactMatchIsoformAndStructureSeq = Object.entries(
    isoformSequences,
  ).find(([_, val]) => structureSequence === val.seq.replace('*', ''))
  const maxKeyLen = max([
    structureName?.length ?? 0,
    ...Object.entries(isoformSequences).map(
      ([_, val]) => getTranscriptDisplayName(val.feature).length,
    ),
  ])
  return (
    <TextField
      variant="outlined"
      multiline
      minRows={5}
      maxRows={10}
      fullWidth
      value={[
        `${structureName.padEnd(maxKeyLen)}${exactMatchIsoformAndStructureSeq ? '*' : ' '} ${structureSequence}`,
        exactMatchIsoformAndStructureSeq
          ? `${getTranscriptDisplayName(exactMatchIsoformAndStructureSeq[1].feature).padEnd(maxKeyLen)}* ${exactMatchIsoformAndStructureSeq[1].seq}`
          : undefined,
        ...Object.entries(isoformSequences)
          .map(
            ([_, val]) =>
              `${getTranscriptDisplayName(val.feature).padEnd(maxKeyLen)}  ${val.seq}`,
          )
          .filter(([k]) => k !== exactMatchIsoformAndStructureSeq?.[0]),
      ]
        .filter(f => !!f)
        .join('\n')}
      InputProps={{
        readOnly: true,
        classes: {
          input: classes.textAreaFont,
        },
      }}
    />
  )
}
