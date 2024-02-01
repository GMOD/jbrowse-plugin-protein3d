import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
  generateMap,
  getDisplayName,
  getTranscriptFeatures,
  stripTrailingVersion,
  z,
} from './util'
import { Mapping } from '../ProteinView/model'

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

const AutoForm = observer(function AutoForm({
  model,
  feature,
}: {
  model: AbstractTrackModel
  feature: Feature
}) {
  const { classes } = useStyles()
  const session = getSession(model)
  // @ts-expect-error
  const { proteinModel } = session
  const { data, error } = proteinModel
  const [choice, setChoice] = useState(0)
  const [mapping, setMapping] = useState<Mapping[]>([])
  const [url, setUrl] = useState('')
  // check if we are looking at a 'two-level' or 'three-level' feature by
  // finding exon/CDS subfeatures. we want to select from transcript names
  const options = getTranscriptFeatures(feature)

  const transcriptIdToPdbMap = useMemo(() => createMapFromData(data), [data])
  const foundF = useCallback(
    (feat?: Feature) => {
      const n1 = stripTrailingVersion(feat?.get('name'))
      const n2 = stripTrailingVersion(feat?.get('id'))
      return (
        transcriptIdToPdbMap.get(n1 ?? '') ?? transcriptIdToPdbMap.get(n2 ?? '')
      )
    },
    [transcriptIdToPdbMap],
  )
  const hasDataForFeatures = useMemo(
    () => options.filter(f => foundF(f)),
    [foundF, options],
  )
  const [userSelection, setUserSelection] = useState('')
  const userSelectionFeat = options.find(f => f.id() === userSelection)

  const foundPdbId = foundF(userSelectionFeat)

  useEffect(() => {
    setUserSelection(hasDataForFeatures[0]?.id())
  }, [hasDataForFeatures])

  useEffect(() => {
    if (foundPdbId && userSelectionFeat) {
      setMapping(generateMap(userSelectionFeat, foundPdbId))
      setUrl(`https://files.rcsb.org/view/${foundPdbId}.cif`)
    }
  }, [foundPdbId, userSelectionFeat, setMapping, setUrl])

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
                      {hasDataForFeatures.map(val => {
                        const r = getDisplayName(val)
                        return (
                          <MenuItem value={val.id()} key={val.id()}>
                            {r} (has data)
                          </MenuItem>
                        )
                      })}
                    </TextField>
                  </div>
                  <div className={classes.section}>
                    {foundPdbId ? (
                      <TextField
                        value={mapping
                          .map(
                            m =>
                              `${m.refName}:${z(m.featureStart)}-${z(
                                m.featureEnd,
                              )}(${m.strand}) ${m.pdbId}:${z(m.proteinStart)}-${z(
                                m.proteinEnd,
                              )}`,
                          )
                          .join('\n')}
                        onChange={() => {
                          /*does nothing now, but should parse and re-store in mapping*/
                        }}
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
                      <Typography color="error">
                        PDB entry not found in BioMart mapping
                      </Typography>
                    )}
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
        <Button variant="contained" color="secondary" onClick={() => {}}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={() => {}}>
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
