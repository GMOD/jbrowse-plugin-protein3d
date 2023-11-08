import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { observer } from 'mobx-react'
import { Link, MenuItem, TextField, Typography } from '@mui/material'
import { makeStyles } from 'tss-react/mui'
import { ErrorMessage, LoadingEllipses } from '@jbrowse/core/ui'
import { Feature } from '@jbrowse/core/util'

// locals
import { Row, getTranscriptFeatures } from './util'

const useStyles = makeStyles()(theme => ({
  textAreaFont: {
    fontFamily: 'Courier New',
  },
  section: {
    marginTop: theme.spacing(6),
  },
}))
const z = (n: number) => n.toLocaleString('en-US')

function stripTrailingVersion(s?: string) {
  return s?.replace(/\.[^/.]+$/, '')
}

function createMapFromData(data?: Row[]) {
  const map = new Map<string, string>()
  if (data) {
    for (const d of data) {
      const { pdb_id, transcript_id, refseq_mrna_id, transcript_id_version } = d
      if (!pdb_id) {
        continue
      }
      if (transcript_id) {
        map.set(transcript_id, pdb_id)
      }
      if (refseq_mrna_id) {
        map.set(refseq_mrna_id, pdb_id)
      }
      if (transcript_id_version) {
        map.set(transcript_id_version, pdb_id)
      }
    }
  }
  return map
}

function getDisplayName(f: Feature) {
  return f.get('name') || f.get('id')
}
const AutoForm = observer(function AutoForm({
  session,
  feature,
  mapping,
  setMapping,
  setUrl,
}: {
  session: {
    proteinModel: {
      data: Row[]
      error: unknown
    }
  }
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
      let iter = 0
      const subs = userSelectionFeat.get('subfeatures') ?? []
      setMapping(
        subs
          .filter(f => f.get('type') === 'CDS')
          .map(f => {
            const ref = f.get('refName').replace('chr', '')
            const s = f.get('start')
            const e = f.get('end')
            const len = e - s
            const op = len / 3
            const ps = iter
            const pe = iter + op
            iter += op
            return `${ref}:${z(s)}-${z(e)}\t${foundPdbId}:${z(ps)}-${z(pe)}`
          })
          .join('\n'),
      )
      setUrl(`https://files.rcsb.org/view/${foundPdbId}.cif`)
    }
  }, [foundPdbId, userSelectionFeat, setMapping, setUrl])

  return (
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
            </>
          )}
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
