import React, { useEffect, useState } from 'react'

import { Tooltip, Typography } from '@mui/material'
import { observer } from 'mobx-react'

// locals
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

  useEffect(() => {
    setPairwiseAlignmentHoverPos(
      structureSeqHoverPos === undefined
        ? undefined
        : structurePositionToAlignmentMap?.[structureSeqHoverPos],
    )
  }, [structurePositionToAlignmentMap, structureSeqHoverPos])

  if (!pairwiseAlignment) {
    return <div>No pairwiseAlignment</div>
  }
  const a0 = pairwiseAlignment.alns[0].seq
  const a1 = pairwiseAlignment.alns[1].seq
  const con = pairwiseAlignment.consensus
  const gapSet = new Set<number>()
  // eslint-disable-next-line unicorn/no-for-loop
  for (let i = 0; i < con.length; i++) {
    const letter = con[i]
    if (letter === '|') {
      gapSet.add(i)
    }
  }

  function onMouseOver(p: number) {
    setPairwiseAlignmentHoverPos(p)
    if (pairwiseAlignmentToStructurePosition) {
      const structureSeqPos = pairwiseAlignmentToStructurePosition[p]
      model.setHoveredPosition({ structureSeqPos })
      hoverProteinToGenome({ model, structureSeqPos })
    }
  }
  function onClick(pairwiseAlignmentPos: number) {
    if (pairwiseAlignmentToStructurePosition) {
      const structureSeqPos =
        pairwiseAlignmentToStructurePosition[pairwiseAlignmentPos]!
      clickProteinToGenome({ model, structureSeqPos }).catch((e: unknown) => {
        console.error(e)
      })
    }
  }
  return (
    <div>
      <ProteinAlignmentHelpButton model={model} />

      <Typography>
        Alignment of the protein structure file&apos;s sequence with the
        selected transcript&apos;s sequence. Green is the aligned portion
      </Typography>
      <div
        style={{
          fontSize: 9,
          fontFamily: 'monospace',
          cursor: 'pointer',
          margin: 8,
          paddingBottom: 8,
          overflow: 'auto',
          whiteSpace: 'nowrap',
        }}
        onMouseLeave={() => {
          model.setHoveredPosition(undefined)
          model.clearHoverGenomeHighlights()
        }}
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
