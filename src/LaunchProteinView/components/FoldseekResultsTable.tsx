import React, { useState } from 'react'

import {
  Button,
  Menu,
  MenuItem,
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

import { caCoordsToPdb, hasValidCaCoords } from '../utils/caCoordsToPdb'
import {
  getConfidenceUrlFromTarget,
  getStructureUrlFromTarget,
  getUniprotIdFromAlphaFoldTarget,
  hasMsaViewPlugin,
  launch1DProteinView,
  launch3DProteinView,
  launchMsaView,
} from '../utils/launchViewUtils'

import type { FoldseekAlignment, FoldseekResult } from '../services/foldseekApi'
import type { AbstractSessionModel, Feature } from '@jbrowse/core/util'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

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

interface FlattenedHit extends FoldseekAlignment {
  db: string
  structureUrl?: string
}

function flattenResults(results: FoldseekResult): FlattenedHit[] {
  const hits: FlattenedHit[] = []
  for (const dbResult of results.results) {
    if (!dbResult.alignments) {
      continue
    }
    for (const alignmentGroup of dbResult.alignments) {
      if (!alignmentGroup) {
        continue
      }
      for (const alignment of alignmentGroup) {
        if (!alignment) {
          continue
        }
        hits.push({
          ...alignment,
          db: dbResult.db,
          structureUrl: getStructureUrlFromTarget(
            alignment.target,
            dbResult.db,
          ),
        })
      }
    }
  }
  hits.sort((a, b) => (a.eval ?? Infinity) - (b.eval ?? Infinity))
  return hits.slice(0, 100)
}

function ActionMenu({
  hit,
  session,
  view,
  feature,
  selectedTranscript,
  userProvidedTranscriptSequence,
  onClose,
}: {
  hit: FlattenedHit
  session: AbstractSessionModel
  view: LinearGenomeViewModel
  feature: Feature
  selectedTranscript?: Feature
  userProvidedTranscriptSequence?: string
  onClose: () => void
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const uniprotId = getUniprotIdFromAlphaFoldTarget(hit.target)
  const isAlphaFold = hit.target.startsWith('AF-')

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLaunch3D = () => {
    handleMenuClose()
    // Use tCa coordinates to generate PDB data if no URL is available
    const pdbData =
      !hit.structureUrl && hasValidCaCoords(hit.tCa, hit.tSeq)
        ? caCoordsToPdb(hit.tCa, hit.tSeq, 'A', hit.target)
        : undefined
    launch3DProteinView({
      session,
      view,
      feature,
      selectedTranscript,
      uniprotId,
      url: hit.structureUrl,
      data: pdbData,
      userProvidedTranscriptSequence,
    })
    onClose()
  }

  const handleLaunch1D = async () => {
    handleMenuClose()
    try {
      await launch1DProteinView({
        session,
        view,
        feature,
        selectedTranscript,
        uniprotId,
        confidenceUrl: getConfidenceUrlFromTarget(hit.target),
      })
    } catch (e) {
      console.error(e)
      session.notifyError(`${e}`, e)
    }
    onClose()
  }

  const handleLaunchMSA = () => {
    handleMenuClose()
    launchMsaView({
      session,
      view,
      feature,
      selectedTranscript,
      uniprotId,
    })
    onClose()
  }

  const canLoad = hit.structureUrl ?? hasValidCaCoords(hit.tCa, hit.tSeq)
  if (!canLoad) {
    return <span>-</span>
  }

  return (
    <>
      <Button size="small" variant="outlined" onClick={handleClick}>
        Load
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
        <MenuItem onClick={handleLaunch3D}>Launch 3D protein view</MenuItem>
        {isAlphaFold && uniprotId ? (
          <MenuItem
            onClick={() => {
              handleLaunch1D().catch((e: unknown) => {
                console.error(e)
              })
            }}
          >
            Launch 1D protein annotation view
          </MenuItem>
        ) : null}
        {isAlphaFold && uniprotId && hasMsaViewPlugin() ? (
          <MenuItem onClick={handleLaunchMSA}>Launch MSA view</MenuItem>
        ) : null}
      </Menu>
    </>
  )
}

export default function FoldseekResultsTable({
  results,
  session,
  view,
  feature,
  selectedTranscript,
  userProvidedTranscriptSequence,
  onClose,
}: {
  results: FoldseekResult
  session: AbstractSessionModel
  view: LinearGenomeViewModel
  feature: Feature
  selectedTranscript?: Feature
  userProvidedTranscriptSequence?: string
  onClose: () => void
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
                <TableCell>{hit.taxName ?? '-'}</TableCell>
                <TableCell>
                  {hit.prob != null ? `${(hit.prob * 100).toFixed(1)}%` : '-'}
                </TableCell>
                <TableCell>
                  {hit.seqId != null ? `${hit.seqId.toFixed(1)}%` : '-'}
                </TableCell>
                <TableCell>
                  {hit.alnLength != null && hit.qLen != null
                    ? `${((hit.alnLength / hit.qLen) * 100).toFixed(1)}%`
                    : '-'}
                </TableCell>
                <TableCell>
                  {hit.eval != null ? hit.eval.toExponential(2) : '-'}
                </TableCell>
                <TableCell>
                  <ActionMenu
                    hit={hit}
                    session={session}
                    view={view}
                    feature={feature}
                    selectedTranscript={selectedTranscript}
                    userProvidedTranscriptSequence={
                      userProvidedTranscriptSequence
                    }
                    onClose={onClose}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}
