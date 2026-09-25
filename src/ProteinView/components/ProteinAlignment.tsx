import React, { useEffect, useRef } from 'react'

import { Tooltip, Typography } from '@mui/material'
import { autorun } from 'mobx'
import { observer } from 'mobx-react'
import {
  alignmentLength,
  describeAlignmentQuality,
  structureAlignedSeq,
  transcriptAlignedSeq,
  uniprotEntryUrl,
} from 'p2s_mapper'
import { makeStyles } from 'tss-react/mui'

import AlignmentRuler from './AlignmentRuler'
import ChainSelect from './ChainSelect'
import { ColorKey, GradientKey } from './ColorKey'
import ColumnOverlays, { SelectionBackdrop } from './ColumnOverlays'
import FeatureTypeLabel from './FeatureTypeLabel'
import ProteinAlignmentHelpButton from './ProteinAlignmentHelpButton'
import ProteinFeatureTrack, { featureTrackHeight } from './ProteinFeatureTrack'
import ResidueValueTrack from './ResidueValueTrack'
import SplitString from './SplitString'
import ExternalLink from '../../components/ExternalLink'
import { followHover, offScreenCenterTarget } from '../autoScroll'
import { LABEL_WIDTH, ROW_HEIGHT } from '../constants'
import useProteinFeatureTrackData from '../hooks/useProteinFeatureTrackData'
import useStructureUniProt from '../hooks/useStructureUniProt'
import {
  HYDROPHOBICITY_KEY_SCORES,
  PLDDT_BANDS,
  hydrophobicityColor,
  plddtColor,
} from '../residueTracks'
import { errorMessage } from '../util'

import type { JBrowsePluginProteinStructureModel } from '../model'

// The alignment is drawn on its own panel rather than the page background, so
// it needs the theme's paper color explicitly — hardcoding white left the
// residue letters (theme text color) invisible under the dark theme.
const useStyles = makeStyles()(theme => ({
  scroll: {
    overflow: 'auto',
    whiteSpace: 'nowrap',
    flex: 1,
    paddingBottom: 10,
    backgroundColor: theme.palette.background.paper,
  },
  trackMessage: {
    position: 'sticky',
    left: 0,
    lineHeight: `${ROW_HEIGHT}px`,
    color: theme.palette.text.secondary,
  },
  trackError: {
    color: theme.palette.error.main,
  },
}))

/**
 * One row of the panel. The label column and the scrolling tracks both draw
 * every row at its `height`, so a label cannot drift from its track: they used
 * to be two lists kept the same height by hand, and a "Loading..." cell that
 * only the label column drew pushed every label below it off its track.
 */
interface TrackRow {
  key: string
  height: number
  label: React.ReactNode
  content: React.ReactNode
  // a click selects the residue under the pointer; the tracks only hover, so
  // a click that misses a feature bar leaves the selection alone
  selectsResidue?: boolean
}

// Which UniProt entry the feature tracks came from. For an AlphaFold model that
// is in the filename, but for a PDB entry it is resolved via SIFTS and is
// otherwise invisible — leaving no way to tell which protein got annotated.
function UniProtProvenance({
  uniprotId,
  uniprotName,
}: {
  uniprotId: string | undefined
  uniprotName: string | undefined
}) {
  return uniprotId ? (
    <Typography variant="caption" color="textSecondary" component="div">
      Feature tracks from UniProt{' '}
      <ExternalLink href={uniprotEntryUrl(uniprotId)}>
        {uniprotName ? `${uniprotId} (${uniprotName})` : uniprotId}
      </ExternalLink>
    </Typography>
  ) : null
}

function GutterLabel({ label, title }: { label: string; title: string }) {
  return (
    <Tooltip title={title} placement="left">
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        {label}
      </div>
    </Tooltip>
  )
}

const ProteinAlignment = observer(function ProteinAlignment({
  model,
}: {
  model: JBrowsePluginProteinStructureModel
}) {
  const {
    alignment,
    alignmentQuality: quality,
    showHighlight,
    showProteinTracks,
    showAllFeatureTracks,
    label,
    confidenceCells,
    columnWidth,
    trackHeight,
    trackGap,
  } = model
  const hydrophobicityCells = showAllFeatureTracks
    ? model.hydrophobicityCells
    : []
  const { classes, cx } = useStyles()
  const containerRef = useRef<HTMLDivElement>(null)
  const lastScrolledSelectionRef = useRef<string | undefined>(undefined)
  // AlphaFold models carry their accession in the URL; PDB entries need a SIFTS
  // lookup, which also supplies the UniProt->structure residue offset.
  const {
    uniprotId,
    uniprotName,
    mapUniProtPosition,
    isLoading: uniprotLoading,
    error: uniprotError,
  } = useStructureUniProt({
    uniprotId: model.uniprotId,
    pdbId: model.pdbId,
    uniProtMappings: model.uniProtMappings,
    uniProtMappingsError: model.uniProtMappingsError,
    mappedEntity: model.mappedEntity,
  })
  const {
    groups,
    isLoading: trackLoading,
    error: trackError,
  } = useProteinFeatureTrackData(model, uniprotId, mapUniProtPosition)
  const featureLoading = uniprotLoading || trackLoading
  // Two different failures reach one row, and "Error" alone leaves the reader
  // guessing whether the structure has no UniProt entry or the entry's
  // features would not download.
  const featureError = uniprotError ?? trackError
  const featureErrorMessage = featureError
    ? `${
        uniprotError
          ? `Could not map ${label} to a UniProt entry through SIFTS`
          : `Could not load UniProt features for ${uniprotId ?? label}`
      }: ${errorMessage(featureError)}`
    : undefined

  useEffect(() => followHover(model, () => containerRef.current), [model])

  // Scroll a selection into view when it changes to an off-screen one — both
  // a declared seed on open and a later click on a distant feature bar, which
  // would otherwise select something the user can't see. Several ranges scroll
  // to their first. Keyed on the ranges so it fires once per distinct
  // selection and doesn't fight the user's own scrolling afterward.
  useEffect(
    () =>
      autorun(() => {
        const container = containerRef.current
        const ranges = model.clickAlignmentRanges
        const range = ranges[0]
        if (container) {
          if (range) {
            const key = ranges.map(r => `${r.start}-${r.end}`).join(',')
            if (key !== lastScrolledSelectionRef.current) {
              lastScrolledSelectionRef.current = key
              const target = offScreenCenterTarget({
                start: range.start * model.columnWidth,
                end: (range.end + 1) * model.columnWidth,
                scrollLeft: container.scrollLeft,
                clientWidth: container.clientWidth,
              })
              if (target !== undefined) {
                container.scrollLeft = target
              }
            }
          } else {
            lastScrolledSelectionRef.current = undefined
          }
        }
      }),
    [model],
  )

  if (!alignment) {
    return null
  }

  const columns = alignmentLength(alignment)
  const valueRowHeight = trackHeight + trackGap
  const sequenceRow = (
    key: string,
    rowLabel: string,
    title: string,
    str: string,
  ): TrackRow => ({
    key,
    height: ROW_HEIGHT,
    label: rowLabel ? <GutterLabel label={rowLabel} title={title} /> : null,
    content: (
      <div style={{ lineHeight: `${ROW_HEIGHT}px` }}>
        <SplitString model={model} str={str} />
      </div>
    ),
    selectsResidue: true,
  })
  const featureStatus =
    featureErrorMessage ?? (featureLoading ? 'Loading UniProt features...' : '')

  const sequenceRows = [
    sequenceRow(
      'transcript',
      'GENOME',
      'This is the sequence of the protein from the reference genome transcript',
      transcriptAlignedSeq(alignment),
    ),
    sequenceRow('consensus', '', '', alignment.consensus),
    sequenceRow(
      'structure',
      'STRUCT',
      'This is the sequence of the protein from the structure file',
      structureAlignedSeq(alignment),
    ),
  ]
  const rows: TrackRow[] = [
    ...sequenceRows,
    {
      key: 'ruler',
      height: ROW_HEIGHT,
      label: (
        <GutterLabel
          label="residue"
          title="Residue numbers as the structure's authors assigned them, the numbering papers and the 3D view's hover label use"
        />
      ),
      content: <AlignmentRuler model={model} columns={columns} />,
      selectsResidue: true,
    },
  ]
  const sequenceHeight = sequenceRows.length * ROW_HEIGHT
  if (showProteinTracks) {
    if (featureStatus) {
      rows.push({
        key: 'uniprot-status',
        height: ROW_HEIGHT,
        label: <GutterLabel label="UniProt" title={featureStatus} />,
        content: (
          <span
            className={cx(
              classes.trackMessage,
              featureErrorMessage && classes.trackError,
            )}
          >
            {featureStatus}
          </span>
        ),
      })
    }
    for (const group of groups ?? []) {
      rows.push({
        key: `feature-${group.type}`,
        height: featureTrackHeight(model, group),
        label: (
          <FeatureTypeLabel
            type={group.type}
            laneCount={group.laneCount}
            model={model}
          />
        ),
        content: <ProteinFeatureTrack group={group} model={model} />,
      })
    }
    if (confidenceCells.length > 0) {
      rows.push({
        key: 'plddt',
        height: valueRowHeight,
        label: (
          <GutterLabel
            label="pLDDT"
            title="AlphaFold per-residue confidence (pLDDT)"
          />
        ),
        content: (
          <ResidueValueTrack
            cells={confidenceCells}
            colorFor={plddtColor}
            formatValue={v => `pLDDT ${v.toFixed(0)}`}
            model={model}
          />
        ),
      })
    }
    if (hydrophobicityCells.length > 0) {
      rows.push({
        key: 'hydrophobicity',
        height: valueRowHeight,
        label: (
          <GutterLabel
            label="hydro"
            title="Kyte-Doolittle hydrophobicity (orange hydrophobic, blue hydrophilic)"
          />
        ),
        content: (
          <ResidueValueTrack
            cells={hydrophobicityCells}
            colorFor={hydrophobicityColor}
            formatValue={v => `Kyte-Doolittle ${v.toFixed(1)}`}
            model={model}
          />
        ),
      })
    }
  }

  const columnAt = (event: React.MouseEvent<HTMLDivElement>) => {
    const { left } = event.currentTarget.getBoundingClientRect()
    const col = Math.floor((event.clientX - left) / columnWidth)
    return col >= 0 && col < columns ? col : undefined
  }

  return (
    <div data-testid="protein-alignment-panel" data-structure={label}>
      {/* A header row rather than a float: a floated picker narrowed the whole
          alignment below it, since a flex container will not overlap a float,
          so a panel with a chain picker lost 200px of sequence to it. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Names the structure this panel aligns, since several panels stack
            over one canvas and nothing else tells 1TUP's from 1YCR's. What the
            rows mean is in the help dialog. */}
        <Typography variant="subtitle2">
          {label}
          {/* Identity and coverage live in the header, which stays visible when
              this panel is hidden. What is left here is what only means
              something inside the panel. */}
          {quality ? (
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{ ml: 1 }}
              data-testid="alignment-quality"
            >
              {describeAlignmentQuality(quality)}
              {showHighlight ? ', green is the aligned portion' : ''}
            </Typography>
          ) : null}
        </Typography>
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <ChainSelect model={model} />
          <ProteinAlignmentHelpButton model={model} />
        </div>
      </div>
      {showProteinTracks ? (
        <UniProtProvenance uniprotId={uniprotId} uniprotName={uniprotName} />
      ) : null}
      <div
        style={{
          display: 'flex',
          fontSize: 9,
          fontFamily: 'monospace',
          margin: 8,
          paddingBottom: 8,
        }}
        onMouseEnter={() => {
          model.setIsMouseInAlignment(true)
        }}
        onMouseLeave={() => {
          model.leaveAlignment()
        }}
      >
        <div
          style={{
            flexShrink: 0,
            minWidth: LABEL_WIDTH,
            paddingRight: 4,
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          {rows.map(row => (
            <div
              key={row.key}
              data-row-label={row.key}
              style={{ height: row.height, overflow: 'hidden' }}
            >
              {row.label}
            </div>
          ))}
        </div>
        <div ref={containerRef} className={classes.scroll}>
          {/* One hover handler for every row: a column is a column whichever
              row the pointer is on. */}
          <div
            data-testid="alignment-rows"
            style={{ position: 'relative', width: columns * columnWidth }}
            onMouseMove={event => {
              const col = columnAt(event)
              if (col === undefined) {
                model.setHoveredPosition(undefined)
              } else {
                model.hoverAlignmentPosition(col)
              }
            }}
            onMouseLeave={() => {
              model.setHoveredPosition(undefined)
            }}
          >
            <SelectionBackdrop model={model} matchHeight={sequenceHeight} />
            {rows.map(row => (
              <div
                key={row.key}
                data-row={row.key}
                style={{
                  position: 'relative',
                  height: row.height,
                  cursor: row.selectsResidue ? 'pointer' : undefined,
                }}
                onClick={
                  row.selectsResidue
                    ? event => {
                        const col = columnAt(event)
                        if (col !== undefined) {
                          model.clickAlignmentPosition(col)
                        }
                      }
                    : undefined
                }
              >
                {row.content}
              </div>
            ))}
            <ColumnOverlays model={model} />
          </div>
        </div>
      </div>
      {showProteinTracks && confidenceCells.length > 0 ? (
        <ColorKey title="pLDDT" entries={PLDDT_BANDS} />
      ) : null}
      {showProteinTracks && hydrophobicityCells.length > 0 ? (
        <GradientKey
          title="Kyte-Doolittle"
          testId="hydrophobicity-legend"
          minLabel="hydrophilic"
          maxLabel="hydrophobic"
          colors={HYDROPHOBICITY_KEY_SCORES.map(score =>
            hydrophobicityColor(score),
          )}
        />
      ) : null}
    </div>
  )
})

export default ProteinAlignment
