import React, { useMemo, useCallback, useEffect, useRef } from 'react'

import { Tooltip, Typography } from '@mui/material'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'

import { JBrowsePluginProteinStructureModel } from '../model'
import ProteinAlignmentHelpButton from './ProteinAlignmentHelpButton'
import {
  clickProteinToGenome,
  hoverProteinToGenome,
} from '../proteinToGenomeMapping'

const HOVER_BACKGROUND_COLOR = '#f698'
const GAP_HIGHLIGHT_COLOR = '#33ff19'

const useStyles = makeStyles()({
  column: {
    display: 'inline-block',
    cursor: 'pointer',
  },
  letter: {
    display: 'block',
    textAlign: 'center',
  },
  columnHovered: {
    display: 'inline-block',
    cursor: 'pointer',
    background: HOVER_BACKGROUND_COLOR,
  },
  columnGapHighlight: {
    display: 'inline-block',
    cursor: 'pointer',
    background: GAP_HIGHLIGHT_COLOR,
  },
  alignmentContainer: {
    fontSize: 9,
    fontFamily: 'monospace',
    margin: 8,
    paddingBottom: 8,
    overflow: 'auto',
    whiteSpace: 'nowrap',
  },
})

type AlignmentItem = {
  top: string
  middle: string
  bottom: string
}

interface AlignmentColumnProps {
  item: AlignmentItem
  index: number
  classes: Record<string, string>
  isGap: boolean
  showHighlight: boolean
  isHovered: boolean
  onMouseOver: (i: number) => void
  onClick: (i: number) => void
}

/**
 * Renders a single column of the alignment (one position across all three sequences)
 * Memoized to prevent unnecessary re-renders
 */
const AlignmentColumn = React.memo(
  React.forwardRef<HTMLDivElement, AlignmentColumnProps>(
    function AlignmentColumn(
      { item, index, classes, isGap, showHighlight, isHovered, onMouseOver, onClick },
      ref,
    ) {
      const getColumnClassName = () => {
        if (isHovered) return classes.columnHovered
        if (isGap && showHighlight) return classes.columnGapHighlight
        return classes.column
      }

      const renderLetter = (char: string) =>
        char === ' ' ? <>&nbsp;</> : char

      return (
        <div
          ref={ref}
          className={getColumnClassName()}
          onMouseOver={() => onMouseOver(index)}
          onClick={() => onClick(index)}
        >
          <span className={classes.letter}>{renderLetter(item.top)}</span>
          <span className={classes.letter}>{renderLetter(item.middle)}</span>
          <span className={classes.letter}>{renderLetter(item.bottom)}</span>
        </div>
      )
    },
  ),
)

const ProteinAlignment = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinStructureModel
}) {
  const { classes } = useStyles()
  const {
    alignmentData,
    pairwiseAlignmentHoverPos,
    pairwiseAlignmentToStructurePosition,
    showHighlight,
  } = model

  const columnRefs = useRef<(HTMLDivElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const isMouseInContainer = useRef(false)

  // Compute which positions represent aligned/matching residues (marked with '|')
  const gapSet = useMemo(() => {
    const alignedPositions = new Set<number>()
    for (let i = 0; i < alignmentData.length; i++) {
      const consensusChar = alignmentData[i]!.middle
      if (consensusChar === '|') {
        alignedPositions.add(i)
      }
    }
    return alignedPositions
  }, [alignmentData])

  // Auto-scroll to hovered column when hover originates from outside the alignment
  useEffect(() => {
    const shouldAutoScroll =
      !isMouseInContainer.current &&
      pairwiseAlignmentHoverPos !== undefined &&
      columnRefs.current[pairwiseAlignmentHoverPos]

    if (shouldAutoScroll) {
      columnRefs.current[pairwiseAlignmentHoverPos]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [pairwiseAlignmentHoverPos])

  if (alignmentData.length === 0) {
    return <div>No pairwiseAlignment</div>
  }

  const handleColumnMouseOver = useCallback(
    (alignmentPosition: number) => {
      model.setPairwiseAlignmentHoverPos(alignmentPosition)

      if (pairwiseAlignmentToStructurePosition) {
        const structureSeqPos =
          pairwiseAlignmentToStructurePosition[alignmentPosition]
        model.setHoveredPosition({ structureSeqPos })
        hoverProteinToGenome({ model, structureSeqPos })
      }
    },
    [model, pairwiseAlignmentToStructurePosition],
  )

  const handleColumnClick = useCallback(
    (alignmentPosition: number) => {
      if (pairwiseAlignmentToStructurePosition) {
        const structureSeqPos =
          pairwiseAlignmentToStructurePosition[alignmentPosition]!
        clickProteinToGenome({ model, structureSeqPos }).catch((e: unknown) => {
          console.error(e)
        })
      }
    },
    [model, pairwiseAlignmentToStructurePosition],
  )

  const handleContainerMouseEnter = useCallback(() => {
    isMouseInContainer.current = true
  }, [])

  const handleContainerMouseLeave = useCallback(() => {
    isMouseInContainer.current = false
    model.setHoveredPosition(undefined)
    model.clearHoverGenomeHighlights()
  }, [model])
  return (
    <div>
      <ProteinAlignmentHelpButton model={model} />

      <Typography>
        Alignment of the protein structure file&apos;s sequence with the
        selected transcript&apos;s sequence. Green is the aligned portion
      </Typography>
      <div
        ref={containerRef}
        className={classes.alignmentContainer}
        onMouseEnter={handleContainerMouseEnter}
        onMouseLeave={handleContainerMouseLeave}
      >
        {alignmentData.map((item, i) => (
          <AlignmentColumn
            key={i}
            ref={el => {
              columnRefs.current[i] = el
            }}
            item={item}
            index={i}
            classes={classes}
            isGap={gapSet.has(i)}
            showHighlight={showHighlight}
            isHovered={i === pairwiseAlignmentHoverPos}
            onMouseOver={handleColumnMouseOver}
            onClick={handleColumnClick}
          />
        ))}
      </div>
    </div>
  )
})

export default ProteinAlignment
