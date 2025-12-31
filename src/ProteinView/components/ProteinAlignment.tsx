import React, { useCallback, useEffect, useRef } from 'react'

import { Tooltip, Typography } from '@mui/material'
import { reaction } from 'mobx'
import { observer } from 'mobx-react'

import { JBrowsePluginProteinStructureModel } from '../model'
import ProteinAlignmentHelpButton from './ProteinAlignmentHelpButton'
import SplitString from './SplitString'

const AutoScroller = observer(function AutoScroller({
  model,
  containerRef,
}: {
  model: JBrowsePluginProteinStructureModel
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  useEffect(
    () =>
      reaction(
        () => model.alignmentHoverPos,
        alignmentHoverPos => {
          const container = containerRef.current
          if (model.isMouseInAlignment || alignmentHoverPos === undefined || !container) {
            return
          }
          const charWidth = 6
          const scrollPosition = alignmentHoverPos * charWidth
          container.scrollTo({
            left: scrollPosition - container.clientWidth / 2,
            behavior: 'smooth',
          })
        },
      ),
    [model, containerRef],
  )

  return null
})

const ProteinAlignment = observer(function ProteinAlignment({
  model,
}: {
  model: JBrowsePluginProteinStructureModel
}) {
  const { pairwiseAlignment, showHighlight } = model

  const containerRef = useRef<HTMLDivElement>(null)

  if (!pairwiseAlignment) {
    return <div>No pairwiseAlignment</div>
  }
  const a0 = pairwiseAlignment.alns[0].seq
  const a1 = pairwiseAlignment.alns[1].seq
  const con = pairwiseAlignment.consensus

  const handleContainerMouseEnter = useCallback(() => {
    model.setIsMouseInAlignment(true)
  }, [model])

  const handleContainerMouseLeave = useCallback(() => {
    model.setIsMouseInAlignment(false)
    model.setHoveredPosition(undefined)
    model.clearHoverGenomeHighlights()
  }, [model])

  return (
    <div>
      <AutoScroller model={model} containerRef={containerRef} />
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
          <SplitString model={model} str={a0} />
        </div>
        <div>
          <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <SplitString model={model} str={con} />
        </div>
        <div>
          <Tooltip title="This is the sequence of the protein from the structure file">
            <span>STRUCT&nbsp;</span>
          </Tooltip>
          <SplitString model={model} str={a1} />
        </div>
      </div>
    </div>
  )
})

export default ProteinAlignment
