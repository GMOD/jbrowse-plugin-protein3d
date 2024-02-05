import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react'
import {
  Button,
  DialogActions,
  DialogContent,
  MenuItem,
  TextField,
  TextFieldProps,
  Typography,
} from '@mui/material'
import { makeStyles } from 'tss-react/mui'
import { AbstractTrackModel, Feature, getSession } from '@jbrowse/core/util'

// locals
import {
  generateMap,
  getGeneDisplayName,
  getId,
  getTranscriptDisplayName,
  getTranscriptFeatures,
  stripTrailingVersion,
} from './util'
import { ErrorMessage } from '@jbrowse/core/ui'
import { jsonfetch } from '../fetchUtils'

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

function TextField2({ children, ...rest }: TextFieldProps) {
  return (
    <div>
      <TextField {...rest}>{children}</TextField>
    </div>
  )
}
interface MyGeneInfoResults {
  hits: {
    uniprot: {
      'Swiss-Prot': string
    }
  }[]
}
function useMyGeneInfo({ id }: { id: string }) {
  const [result, setResult] = useState<MyGeneInfoResults>()
  const [error, setError] = useState<unknown>()
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        const res = await jsonfetch(
          `https://mygene.info/v3/query?q=${stripTrailingVersion(id)}&fields=uniprot,symbol`,
        )
        setResult(res)
      } catch (e) {
        console.error(e)
        setError(e)
      }
    })()
  }, [id])
  return { result: result?.hits[0].uniprot['Swiss-Prot'], error }
}
const MyGeneInfoSearch = observer(function MyGeneInfoSearch({
  feature,
  model,
  handleClose,
}: {
  feature: Feature
  model: AbstractTrackModel
  handleClose: () => void
}) {
  const { classes } = useStyles()
  const session = getSession(model)

  // check if we are looking at a 'two-level' or 'three-level' feature by
  // finding exon/CDS subfeatures. we want to select from transcript names
  const options = getTranscriptFeatures(feature)
  const [userSelection, setUserSelection] = useState(getId(options[0]))
  // const view = getContainingView(model) as LinearGenomeViewModel
  // const selectedTranscript = options.find(val => getId(val) === userSelection)!
  // const { sequence, error: error2 } = useFeatureSequence({
  //   view,
  //   feature: selectedTranscript,
  // })
  // const protein =
  //   sequence && !('error' in sequence)
  //     ? getProteinSequence({
  //         seq: sequence.seq,
  //         selectedTranscript,
  //       })
  //     : ''

  const { result: foundStructureId, error } = useMyGeneInfo({
    id: userSelection,
  })

  const userSelectionFeat = options.find(f => getId(f) === userSelection)
  const mapping =
    foundStructureId && userSelectionFeat
      ? generateMap(userSelectionFeat, foundStructureId)
      : []

  const e = error
  const url = `https://alphafold.ebi.ac.uk/files/AF-${foundStructureId}-F1-model_v4.cif`
  return (
    <>
      <DialogContent className={classes.dialogContent}>
        <div className={classes.section}>
          {e ? <ErrorMessage error={e} /> : null}
          <div>
            Find Uniprot ID from MyGene.info, and access result from AlphaFold
          </div>
          <TextField2
            value={userSelection}
            onChange={event => setUserSelection(event.target.value)}
            label="Choose isoform to search"
            select
          >
            {options.map(val => (
              <MenuItem value={getId(val)} key={val.id()}>
                {getGeneDisplayName(feature)} - {getTranscriptDisplayName(val)}
              </MenuItem>
            ))}
          </TextField2>
          <Typography>Found Uniprot ID: {foundStructureId}</Typography>
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => handleClose()}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!foundStructureId}
          onClick={() => {
            session.addView('ProteinView', {
              type: 'ProteinView',
              url,
              mapping,
            })
            handleClose()
          }}
        >
          Submit
        </Button>
      </DialogActions>
    </>
  )
})

export default MyGeneInfoSearch
