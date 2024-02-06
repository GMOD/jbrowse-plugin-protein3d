import React from 'react'
import { TextField, Typography } from '@mui/material'
import { makeStyles } from 'tss-react/mui'

// locals
import { z } from './util'
import { generateGenomeToProteinMapping } from './generateGenomeToProteinMapping'

function str(refName: string, start: number, end: number, strand?: number) {
  return [
    `${refName}:${z(start)}-${z(end)}`,
    strand === undefined ? undefined : `${strand}`,
  ]
    .filter(f => !!f)
    .join('')
}
const useStyles = makeStyles()(theme => ({
  textAreaFont: {
    fontFamily: 'Courier New',
  },
  section: {
    marginTop: theme.spacing(6),
  },
}))

export default function MappingTextField({
  mapping,
  foundStructureId,
}: {
  mapping: ReturnType<typeof generateGenomeToProteinMapping>
  foundStructureId?: string
}) {
  const { classes } = useStyles()

  return (
    <div className={classes.section}>
      {foundStructureId ? (
        <TextField
          value={mapping
            .map(m =>
              [
                str(m.refName, m.featureStart, m.featureEnd, m.strand),
                str('P', m.targetProteinStart || -1, m.targetProteinEnd || -1),
              ].join(' '),
            )
            .join('\n')}
          label="Genome to protein coordinate mapping"
          variant="outlined"
          multiline
          minRows={10}
          maxRows={15}
          InputProps={{
            classes: {
              input: classes.textAreaFont,
            },
          }}
          fullWidth
        />
      ) : (
        <Typography color="error">Structure not found</Typography>
      )}
    </div>
  )
}
