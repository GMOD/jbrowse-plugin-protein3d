import React, { useCallback, useEffect, useRef, useState } from 'react'

import { Tooltip, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import { JBrowsePluginProteinStructureModel } from '../model'
import ProteinAlignmentHelpButton from './ProteinAlignmentHelpButton'
import {
  clickProteinToGenome,
  hoverProteinToGenome,
} from '../proteinToGenomeMapping'
import SplitString from './SplitString'

const ProteinAlignment = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinStructureModel
}) {
  const {
    pairwiseAlignment,
    pairwiseAlignmentToStructurePosition,
    structurePositionToAlignmentMap,
    structureSeqHoverPos,
    showHighlight,
  } = model

  const [pairwiseAlignmentHoverPos, setPairwiseAlignmentHoverPos] =
    useState<number>()

  const containerRef = useRef<HTMLDivElement>(null)
  const isMouseInContainer = useRef(false)

  useEffect(() => {
    setPairwiseAlignmentHoverPos(
      structureSeqHoverPos === undefined
        ? undefined
        : structurePositionToAlignmentMap?.[structureSeqHoverPos],
    )
  }, [structurePositionToAlignmentMap, structureSeqHoverPos])

  // Auto-scroll to hovered position when hover originates from outside the alignment
  useEffect(() => {
    const shouldAutoScroll =
      !isMouseInContainer.current &&
      pairwiseAlignmentHoverPos !== undefined &&
      containerRef.current

    if (shouldAutoScroll) {
      // Calculate approximate scroll position (monospace font, ~6px per character at fontSize 9)
      const charWidth = 6
      const scrollPosition = pairwiseAlignmentHoverPos * charWidth
      const containerWidth = containerRef.current!.clientWidth

      containerRef.current!.scrollTo({
        left: scrollPosition - containerWidth / 2,
        behavior: 'smooth',
      })
    }
  }, [pairwiseAlignmentHoverPos])

  if (!pairwiseAlignment) {
    return <div>No pairwiseAlignment</div>
  }
  const a0 = pairwiseAlignment.alns[0].seq
  const a1 = pairwiseAlignment.alns[1].seq
  const con = pairwiseAlignment.consensus
  const gapSet = new Set<number>()
  for (let i = 0; i < con.length; i++) {
    const letter = con[i]
    if (letter === '|') {
      gapSet.add(i)
    }
  }

  const onMouseOver = useCallback(
    (p: number) => {
      setPairwiseAlignmentHoverPos(p)
      if (pairwiseAlignmentToStructurePosition) {
        const structureSeqPos = pairwiseAlignmentToStructurePosition[p]
        model.setHoveredPosition({ structureSeqPos })
        hoverProteinToGenome({ model, structureSeqPos })
      }
    },
    [pairwiseAlignmentToStructurePosition, model],
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
    [pairwiseAlignmentToStructurePosition, model],
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
        selected transcript&apos;s sequence.{' '}
        {showHighlight ? 'Green is the aligned portion' : null}
      </Typography>
      <div
        ref={containerRef}
        style={{
          fontSize: 9,
          fontFamily: 'monospace',
          cursor: 'pointer',
          margin: 8,
          paddingBottom: 8,
          overflow: 'auto',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={handleContainerMouseEnter}
        onMouseLeave={handleContainerMouseLeave}
      >
        <div>
          <Tooltip title="This is the sequence of the protein from the reference genome transcript">
            <span>GENOME&nbsp;</span>
          </Tooltip>
          <SplitString
            str={a0}
            showHighlight={showHighlight}
            hoveredPosition={pairwiseAlignmentHoverPos}
            gapSet={gapSet}
            onMouseOver={onMouseOver}
            onClick={onClick}
          />
        </div>
        <div>
          <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <SplitString
            showHighlight={showHighlight}
            str={con}
            hoveredPosition={pairwiseAlignmentHoverPos}
            gapSet={gapSet}
            onMouseOver={onMouseOver}
            onClick={onClick}
          />
        </div>
        <div>
          <Tooltip title="This is the sequence of the protein from the structure file">
            <span>STRUCT&nbsp;</span>
          </Tooltip>
          <SplitString
            str={a1}
            hoveredPosition={pairwiseAlignmentHoverPos}
            showHighlight={showHighlight}
            gapSet={gapSet}
            onMouseOver={onMouseOver}
            onClick={onClick}
          />
        </div>
      </div>
    </div>
  )
})

export default ProteinAlignment
