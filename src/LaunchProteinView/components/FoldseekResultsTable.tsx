import React from 'react'

import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { makeStyles } from 'tss-react/mui'

import type {
  FoldseekAlignment,
  FoldseekResult,
} from '../services/foldseekApi'

const useStyles = makeStyles()({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  tableContainer: {
    maxHeight: 400,
  },
  headerCell: {
    fontWeight: 'bold',
    backgroundColor: '#f5f5f5',
  },
  noResults: {
    padding: 16,
    textAlign: 'center',
  },
})

function getStructureUrl(target: string, db: string) {
  if (target.startsWith('AF-')) {
    const match = /AF-([A-Z0-9]+)-F\d+/.exec(target)
    if (match) {
      return `https://alphafold.ebi.ac.uk/files/${target}-model_v4.cif`
    }
  }
  if (db === 'pdb100') {
    const pdbId = target.split('_')[0]
    if (pdbId) {
      return `https://files.rcsb.org/download/${pdbId}.cif`
    }
  }
  return undefined
}

interface FlattenedHit extends FoldseekAlignment {
  db: string
  structureUrl?: string
}

function flattenResults(results: FoldseekResult): FlattenedHit[] {
  const hits: FlattenedHit[] = []
  for (const dbResult of results.results) {
    for (const alignmentGroup of dbResult.alignments) {
      for (const alignment of alignmentGroup) {
        hits.push({
          ...alignment,
          db: dbResult.db,
          structureUrl: getStructureUrl(alignment.target, dbResult.db),
        })
      }
    }
  }
  hits.sort((a, b) => b.prob - a.prob)
  return hits.slice(0, 100)
}

export default function FoldseekResultsTable({
  results,
  onLoadStructure,
}: {
  results: FoldseekResult
  onLoadStructure?: (url: string, target: string) => void
}) {
  const { classes } = useStyles()
  const flatHits = flattenResults(results)

  if (flatHits.length === 0) {
    return (
      <Paper className={classes.noResults}>
        <Typography>No similar structures found</Typography>
      </Paper>
    )
  }

  return (
    <div className={classes.root}>
      <Typography variant="subtitle2">
        Found {flatHits.length} similar structures
      </Typography>
      <TableContainer component={Paper} className={classes.tableContainer}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell className={classes.headerCell}>Database</TableCell>
              <TableCell className={classes.headerCell}>Target</TableCell>
              <TableCell className={classes.headerCell}>Organism</TableCell>
              <TableCell className={classes.headerCell}>Prob</TableCell>
              <TableCell className={classes.headerCell}>Seq. Id.</TableCell>
              <TableCell className={classes.headerCell}>Coverage</TableCell>
              <TableCell className={classes.headerCell}>E-value</TableCell>
              <TableCell className={classes.headerCell}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {flatHits.map((hit, idx) => (
              <TableRow key={`${hit.db}-${hit.target}-${idx}`}>
                <TableCell>{hit.db}</TableCell>
                <TableCell>{hit.target}</TableCell>
                <TableCell>{hit.taxName || '-'}</TableCell>
                <TableCell>{(hit.prob * 100).toFixed(1)}%</TableCell>
                <TableCell>{hit.seqId.toFixed(1)}%</TableCell>
                <TableCell>
                  {((hit.alnLength / hit.qLen) * 100).toFixed(1)}%
                </TableCell>
                <TableCell>{hit.eValue.toExponential(2)}</TableCell>
                <TableCell>
                  {hit.structureUrl && onLoadStructure ? (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        onLoadStructure(hit.structureUrl!, hit.target)
                      }
                    >
                      Load
                    </Button>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}
