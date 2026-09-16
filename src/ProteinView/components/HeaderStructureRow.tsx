import React from 'react'

import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { observer } from 'mobx-react'

import {
  LOW_IDENTITY_OVER_SHORTER,
  SHORT_ALIGNMENT_IDENTITY,
  SHORT_ALIGNMENT_RESIDUES,
  describeCoveredRange,
  describeTranscriptCoverage,
  isLowSimilarity,
} from '../alignmentQuality'

import type {
  JBrowsePluginProteinStructureModel,
  JBrowsePluginProteinViewModel,
} from '../model'

const LOW_SIMILARITY_EXPLANATION = `Under ${Math.round(
  LOW_IDENTITY_OVER_SHORTER * 100,
)}% of the shorter sequence is identical (${Math.round(
  SHORT_ALIGNMENT_IDENTITY * 100,
)}% for an alignment of fewer than ${SHORT_ALIGNMENT_RESIDUES} residues): an alignment this weak is what two unrelated proteins produce, so the positions it maps may be unrelated. Check the mapped chain, the transcript isoform, or import a curated alignment.`

const StructureRow = observer(function StructureRow({
  structure,
}: {
  structure: JBrowsePluginProteinStructureModel
}) {
  const { label, alignmentQuality: quality } = structure
  const coveredRange = quality ? describeCoveredRange(quality) : undefined
  return (
    <div
      data-testid="structure-row"
      data-structure={label}
      style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 24 }}
    >
      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
        {label}
      </Typography>
      {quality ? (
        <Typography
          variant="caption"
          color="textSecondary"
          data-testid="header-alignment-quality"
        >
          {describeTranscriptCoverage(quality)}
          {coveredRange ? `, ${coveredRange}` : ''}
        </Typography>
      ) : null}
      {quality && isLowSimilarity(quality) ? (
        <Tooltip title={LOW_SIMILARITY_EXPLANATION}>
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label="low similarity"
            data-testid="header-low-similarity"
          />
        </Tooltip>
      ) : null}
    </div>
  )
})

/**
 * One line per structure, in the header the reader always sees. The identity
 * and coverage readout used to live only inside the pairwise panel, which the
 * same reader can hide — so how much of the transcript a structure speaks for,
 * and whether the mapping is chance, were one click away from invisible.
 */
const HeaderStructureRows = observer(function HeaderStructureRows({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  return (
    <div>
      {model.structures.map((structure, idx) => (
        <StructureRow key={idx} structure={structure} />
      ))}
    </div>
  )
})

export default HeaderStructureRows
