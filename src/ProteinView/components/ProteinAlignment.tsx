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

const useStyles = makeStyles()({
  column: {
    display: 'inline-block',
    cursor: 'pointer',
  },
  letter: {
    display: 'block',
    textAlign: 'center',
  },
  hovered: {
    background: '#f698',
  },
  gapHighlight: {
    background: '#33ff19',
  },
  columnHovered: {
    display: 'inline-block',
    cursor: 'pointer',
    background: '#f698',
  },
  columnGapHighlight: {
    display: 'inline-block',
    cursor: 'pointer',
    background: '#33ff19',
  },
  pre: {
    fontSize: 9,
    fontFamily: 'monospace',
    margin: 8,
    paddingBottom: 8,
    overflow: 'auto',
    whiteSpace: 'nowrap',
  },
})

// Memoized column component - React.memo prevents re-rendering when props don't change
const AlignmentColumn = React.memo(
  React.forwardRef<
    HTMLDivElement,
    {
      item: { top: string; middle: string; bottom: string }
      index: number
      classes: Record<string, string>
      isGap: boolean
      showHighlight: boolean
      isHovered: boolean
      onMouseOver: (i: number) => void
      onClick: (i: number) => void
    }
  >(function AlignmentColumn(
    { item, index, classes, isGap, showHighlight, isHovered, onMouseOver, onClick },
    ref,
  ) {
    const className = isHovered
      ? classes.columnHovered
      : isGap && showHighlight
        ? classes.columnGapHighlight
        : classes.column

    return (
      <div
        ref={ref}
        className={className}
        onMouseOver={() => onMouseOver(index)}
        onClick={() => onClick(index)}
      >
        <span className={classes.letter}>
          {item.top === ' ' ? <>&nbsp;</> : item.top}
        </span>
        <span className={classes.letter}>
          {item.middle === ' ' ? <>&nbsp;</> : item.middle}
        </span>
        <span className={classes.letter}>
          {item.bottom === ' ' ? <>&nbsp;</> : item.bottom}
        </span>
      </div>
    )
  }),
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

  // Refs for each column
  const columnRefs = useRef<(HTMLDivElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const isMouseInContainer = useRef(false)

  if (alignmentData.length === 0) {
    return <div>No pairwiseAlignment</div>
  }

  // Scroll to hovered position only if mouse is not in the alignment area
  useEffect(() => {
    if (
      !isMouseInContainer.current &&
      pairwiseAlignmentHoverPos !== undefined &&
      columnRefs.current[pairwiseAlignmentHoverPos]
    ) {
      columnRefs.current[pairwiseAlignmentHoverPos]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [pairwiseAlignmentHoverPos])

  // Memoize gapSet so it's only recomputed when alignment changes
  const gapSet = useMemo(() => {
    const set = new Set<number>()
    for (let i = 0; i < alignmentData.length; i++) {
      const letter = alignmentData[i]!.middle
      if (letter === '|') {
        set.add(i)
      }
    }
    return set
  }, [alignmentData])

  // Memoize callbacks to prevent recreation on every render
  const onMouseOver = useCallback(
    (i: number) => {
      model.setPairwiseAlignmentHoverPos(i)
      if (pairwiseAlignmentToStructurePosition) {
        const structureSeqPos = pairwiseAlignmentToStructurePosition[i]
        model.setHoveredPosition({ structureSeqPos })
        hoverProteinToGenome({ model, structureSeqPos })
      }
    },
    [model, pairwiseAlignmentToStructurePosition],
  )

  const onClick = useCallback(
    (pairwiseAlignmentPos: number) => {
      if (pairwiseAlignmentToStructurePosition) {
        const structureSeqPos =
          pairwiseAlignmentToStructurePosition[pairwiseAlignmentPos]!
        clickProteinToGenome({ model, structureSeqPos }).catch((e: unknown) => {
          console.error(e)
        })
      }
    },
    [model, pairwiseAlignmentToStructurePosition],
  )

  const onMouseEnter = useCallback(() => {
    isMouseInContainer.current = true
  }, [])

  const onMouseLeave = useCallback(() => {
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
        className={classes.pre}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
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
            onMouseOver={onMouseOver}
            onClick={onClick}
          />
        ))}
      </div>
    </div>
  )
})

export default ProteinAlignment
