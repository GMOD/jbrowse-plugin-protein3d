import React, { useEffect, useMemo, useState } from 'react'
import { observer } from 'mobx-react'
import {
  Button,
  DialogActions,
  DialogContent,
  Link,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import { makeStyles } from 'tss-react/mui'
import { ErrorMessage, LoadingEllipses } from '@jbrowse/core/ui'
import { AbstractTrackModel, Feature, getSession } from '@jbrowse/core/util'

// locals
import {
  createMapFromData,
  getDisplayName,
  getTranscriptFeatures,
  stripTrailingVersion,
} from '../util'
import { genomeToProteinMapping } from '../../genomeToProteinMapping'

const useStyles = makeStyles()(theme => ({
  section: {
    marginTop: theme.spacing(6),
  },

  dialogContent: {
    width: '80em',
  },
}))

function foundF(f: Feature | undefined, map: Map<string, string>) {
  return (
    map.get(stripTrailingVersion(f?.get('name')) ?? '') ??
    map.get(stripTrailingVersion(f?.get('id')) ?? '')
  )
}

const AutoForm = observer(function AutoForm({
  model,
  feature,
  handleClose,
}: {
  model: AbstractTrackModel
  feature: Feature
  handleClose: () => void
}) {
  const { classes } = useStyles()
  const session = getSession(model)
  // @ts-expect-error
  const { proteinModel } = session
  const { data, error } = proteinModel
  // check if we are looking at a 'two-level' or 'three-level' feature by
  // finding exon/CDS subfeatures. we want to select from transcript names
  const options = getTranscriptFeatures(feature)
  const transcriptIdToStructureMap = useMemo(
    () => createMapFromData(data),
    [data],
  )

  const hasDataForFeatures = useMemo(
    () => options.filter(f => foundF(f, transcriptIdToStructureMap)),
    [transcriptIdToStructureMap, options],
  )
  const [userSelection, setUserSelection] = useState('')
  const userSelectionFeat = options.find(f => f.id() === userSelection)
  const foundStructureId = foundF(userSelectionFeat, transcriptIdToStructureMap)

  useEffect(() => {
    setUserSelection(hasDataForFeatures[0]?.id())
  }, [hasDataForFeatures])

  const mapping =
    foundStructureId && userSelectionFeat
      ? genomeToProteinMapping({
          feature: userSelectionFeat,
        })
      : []
  const url = foundStructureId
    ? `https://files.rcsb.org/view/${foundStructureId}.cif`
    : undefined

  return (
    <>
      <DialogContent className={classes.dialogContent}>
        <div className={classes.section}>
          {error ? (
            <ErrorMessage error={error} />
          ) : data ? (
            <div>
              <Intro />
              {hasDataForFeatures.length === 0 ? (
                <Typography color="error">No data for feature</Typography>
              ) : (
                <>
                  <div className={classes.section}>
                    <TextField
                      value={userSelection}
                      onChange={event => setUserSelection(event.target.value)}
                      label="Choose isoform"
                      select
                    >
                      {hasDataForFeatures.map(val => (
                        <MenuItem value={val.id()} key={val.id()}>
                          {getDisplayName(val)} (has data)
                        </MenuItem>
                      ))}
                    </TextField>
                  </div>
                </>
              )}
            </div>
          ) : (
            <LoadingEllipses />
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" color="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
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

function Intro() {
  return (
    <div>
      Find structure associated with gene ID:{' '}
      <Link href="http://useast.ensembl.org/biomart/martview/4b20effd49654183333b81e98757976f?VIRTUALSCHEMANAME=default&ATTRIBUTES=hsapiens_gene_ensembl.default.feature_page.ensembl_gene_id|hsapiens_gene_ensembl.default.feature_page.ensembl_gene_id_version|hsapiens_gene_ensembl.default.feature_page.ensembl_transcript_id|hsapiens_gene_ensembl.default.feature_page.ensembl_transcript_id_version|hsapiens_gene_ensembl.default.feature_page.pdb|hsapiens_gene_ensembl.default.feature_page.refseq_mrna|hsapiens_gene_ensembl.default.feature_page.refseq_mrna_predicted&FILTERS=&VISIBLEPANEL=attributepanel">
        Human mappings generated from BioMart (April 13, 2023)
      </Link>
    </div>
  )
}

export default AutoForm
