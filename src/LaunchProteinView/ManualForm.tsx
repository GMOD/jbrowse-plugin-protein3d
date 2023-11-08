import React, { useState } from 'react'
import {
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material'
import { makeStyles } from 'tss-react/mui'
import { Mapping } from '../ProteinView/model'

const useStyles = makeStyles()(theme => ({
  textAreaFont: {
    fontFamily: 'Courier New',
  },
  section: {
    marginTop: theme.spacing(6),
  },
}))
export default function ManualForm({
  url,
  setUrl,
  mapping,
  setMapping,
}: {
  setUrl: (arg: string) => void
  url: string
  mapping: Mapping[]
  setMapping: (arg: Mapping[]) => void
}) {
  const { classes } = useStyles()
  const [choice, setChoice] = useState('url')

  return (
    <div>
      <div className={classes.section}>
        <FormControl>
          <RadioGroup
            row
            value={choice}
            onChange={event => setChoice(event.target.value)}
          >
            <FormControlLabel value="file" control={<Radio />} label="File" />
            <FormControlLabel value="url" control={<Radio />} label="URL" />
          </RadioGroup>
        </FormControl>
      </div>
      <div className={classes.section}>
        {choice === 'url' ? (
          <TextField
            variant="outlined"
            label="URL for structure (PDB, CIF, etc.)"
            size="medium"
            value={url}
            fullWidth
            onChange={event => setUrl(event.target.value)}
            name="structure_url"
          />
        ) : (
          <Button variant="contained" component="label">
            Open file (PDB, CIF, etc.)
            <input type="file" hidden />
          </Button>
        )}
      </div>
      <div className={classes.section}>
        <TextField
          value={mapping}
          name="genome_mapping"
          label="Genome-to-protein coordinate mapping"
          onChange={() => {
            /* do nothing */
          }}
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
      </div>
    </div>
  )
}
