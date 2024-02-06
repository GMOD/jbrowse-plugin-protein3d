import React from 'react'
import { TextField, Typography } from '@mui/material'
import { makeStyles } from 'tss-react/mui'

// locals
import { generateMap, z } from './util'
import { Feature } from '@jbrowse/core/util'

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

  dialogContent: {
    width: '80em',
  },
}))

export default function MappingTextField({
  mapping,
  foundStructureId,
}: {
  mapping: ReturnType<typeof generateMap>
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
                str(m.structureId, m.proteinStart, m.proteinEnd),
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
