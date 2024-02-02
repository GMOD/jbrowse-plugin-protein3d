import React, { useState } from 'react'
import {
  Button,
  DialogActions,
  DialogContent,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material'
import { makeStyles } from 'tss-react/mui'
import { Mapping } from '../ProteinView/model'
import { AbstractTrackModel } from '@jbrowse/core/util'

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
export default function ManualForm({
  feature,
  model,
}: {
  model: AbstractTrackModel
  feature: Feature
}) {
  const { classes } = useStyles()
  const [choice, setChoice] = useState('url')
  const [mapping, setMapping] = useState<Mapping[]>([])
  const [url, setUrl] = useState('')
  // check if we are looking at a 'two-level' or 'three-level' feature by
  // finding exon/CDS subfeatures. we want to select from transcript names

  return (
    <>
      <DialogContent className={classes.dialogContent}>
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
      </DialogContent>
      <DialogActions>
        <Button variant="contained" color="secondary" onClick={() => {}}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={() => {}}>
          Submit
        </Button>
      </DialogActions>
    </>
  )
}
