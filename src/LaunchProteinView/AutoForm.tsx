import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react'
import { Link, MenuItem, TextField, Typography } from '@mui/material'
import { makeStyles } from 'tss-react/mui'
import { ErrorMessage, LoadingEllipses } from '@jbrowse/core/ui'
import { Feature } from '@jbrowse/core/util'

// locals
import { Row, check, getTranscriptFeatures } from './util'

const useStyles = makeStyles()(theme => ({
  dialogContent: {
    width: '80em',
  },
  textAreaFont: {
    fontFamily: 'Courier New',
  },
  section: {
    marginTop: theme.spacing(6),
  },
}))
const z = (n: number) => n.toLocaleString('en-US')

const AutoForm = observer(function AutoForm({
  session,
  feature,
  mapping,
  setMapping,
  setUrl,
}: {
  session: { proteinModel: { data: Row[]; error: unknown } }
  feature: Feature
  mapping: string
  url: string
  setUrl: (arg: string) => void
  setMapping: (arg: string) => void
}) {
  const { classes } = useStyles()
  const { proteinModel } = session
  const { data, error } = proteinModel

  // check if we are looking at a 'two-level' or 'three-level' feature by
  // finding exon/CDS subfeatures. we want to select from transcript names
  const options = getTranscriptFeatures(feature)
  const [userSelection, setUserSelection] = useState(options[0]?.id())
  const userSelectionFeat = options.find(f => f.id() === userSelection)

  const found =
    userSelectionFeat &&
    data?.find(
      row =>
        check(row, userSelectionFeat.get('name').replace(/\.[^/.]+$/, '')) ||
        check(row, userSelectionFeat.get('id').replace(/\.[^/.]+$/, '')),
    )

  useEffect(() => {
    if (found) {
      let iter = 0
      const subs = userSelectionFeat.get('subfeatures') ?? []
      const { pdb_id } = found
      setMapping(
        subs
          .filter(f => f.get('type') === 'CDS')
          .map(f => {
            const ref = f.get('refName').replace('chr', '')
            const s = f.get('start')
            const e = f.get('end')
            const len = e - s
            const op = Math.floor(len / 3)
            const ps = iter
            const pe = iter + op
            iter += op
            return `${ref}:${z(s)}-${z(e)}\t${pdb_id}:${z(ps)}-${z(pe)}`
          })
          .join('\n'),
      )
      setUrl(`https://files.rcsb.org/view/${pdb_id}.cif`)
    }
  }, [found, userSelectionFeat, setMapping, setUrl])

  return (
    <div className={classes.section}>
      {error ? (
        <ErrorMessage error={error} />
      ) : data ? (
        <div>
          <Intro />
          <div className={classes.section}>
            <TextField
              value={userSelection}
              onChange={event => setUserSelection(event.target.value)}
              label="Choose isoform"
              select
            >
              {options.map((val, idx) => (
                <MenuItem value={val.id()} key={val.id() + '-' + idx}>
                  {val.get('name') || val.get('id')}
                </MenuItem>
              ))}
            </TextField>
          </div>
          <div className={classes.section}>
            {found ? (
              <TextField
                value={mapping}
                onChange={event => setMapping(event.target.value)}
                label="Genome to protein mapping"
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
        </div>
      ) : (
        <LoadingEllipses />
      )}
    </div>
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
