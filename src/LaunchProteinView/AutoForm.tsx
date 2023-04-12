import React, { useEffect, useState } from 'react'
import { Link, MenuItem, TextField, Typography } from '@mui/material'
import { makeStyles } from 'tss-react/mui'
import { ErrorMessage, LoadingEllipses } from '@jbrowse/core/ui'
import { Feature } from '@jbrowse/core/util'

// locals
import { check, getTranscriptFeatures, useBiomartMappings } from './util'

const useStyles = makeStyles()((theme) => ({
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

export default function AutoForm({
  feature,
  mapping,
  url,
  setMapping,
  setUrl,
}: {
  feature: Feature
  mapping: string
  url: string
  setUrl: (arg: string) => void
  setMapping: (arg: string) => void
}) {
  const { classes } = useStyles()
  const [data, error] = useBiomartMappings(
    'https://jbrowse.org/demos/protein3d/mart_export.txt.gz',
  )

  // check if we are looking at a 'two-level' or 'three-level' feature by
  // finding exon/CDS subfeatures. we want to select from transcript names
  const options = getTranscriptFeatures(feature)
  const [userSelection, setUserSelection] = useState(options[0]?.id())
  const userSelectionFeat = options.find((f) => f.id() === userSelection)

  const found =
    userSelectionFeat &&
    data?.find(
      (row) =>
        check(row, userSelectionFeat.get('name')) ||
        check(row, userSelectionFeat.get('id')),
    )
  console.log(
    found,
    options.map((f) => f.get('name') || f.get('id')),
  )

  useEffect(() => {
    if (found) {
      const z = (n: number) => n.toLocaleString('en-US')
      let iter = 0
      const subs = userSelectionFeat.get('subfeatures') || []
      setMapping(
        subs
          .filter((f) => f.get('type') === 'CDS')
          .map((f) => {
            const ref = f.get('refName')
            const s = f.get('start')
            const e = f.get('end')
            const len = e - s
            const op = Math.floor(len / 3)
            const ps = iter
            const pe = iter + op
            iter += op
            return `${ref}:${z(s)}-${z(e)}\t${found.pdb_id}:${z(ps)}-${z(pe)}`
          })
          .join('\n'),
      )
      setUrl(`https://files.rcsb.org/view/${found.pdb_id}.cif`)
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
              onChange={(event) => setUserSelection(event.target.value)}
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
                multiline
                fullWidth
                value={mapping}
                onChange={(event) => setMapping(event.target.value)}
                label="Genome to protein mapping"
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
}

function Intro() {
  return (
    <Typography>
      Find PDB structure associated with gene ID:{' '}
      <Link href="http://useast.ensembl.org/biomart/martview/4b20effd49654183333b81e98757976f?VIRTUALSCHEMANAME=default&ATTRIBUTES=hsapiens_gene_ensembl.default.feature_page.ensembl_gene_id|hsapiens_gene_ensembl.default.feature_page.ensembl_gene_id_version|hsapiens_gene_ensembl.default.feature_page.ensembl_transcript_id|hsapiens_gene_ensembl.default.feature_page.ensembl_transcript_id_version|hsapiens_gene_ensembl.default.feature_page.pdb|hsapiens_gene_ensembl.default.feature_page.refseq_mrna|hsapiens_gene_ensembl.default.feature_page.refseq_mrna_predicted&FILTERS=&VISIBLEPANEL=attributepanel">
        Human mappings generated from BioMart (April 13, 2023)
      </Link>
    </Typography>
  )
}
