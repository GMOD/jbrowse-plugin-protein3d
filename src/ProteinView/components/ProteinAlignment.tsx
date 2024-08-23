import React from 'react'
import { observer } from 'mobx-react'
import { Tooltip, Typography } from '@mui/material'

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
    alignment,
    alignmentToStructurePosition,
    structurePositionToAlignmentMap,
    structureSeqHoverPos,
    showHighlight,
  } = model
  if (!alignment) {
    return <div>No alignment</div>
  }
  const a0 = alignment.alns[0].seq
  const a1 = alignment.alns[1].seq
  const con = alignment.consensus
  const set = new Set<number>()
  // eslint-disable-next-line unicorn/no-for-loop
  for (let i = 0; i < con.length; i++) {
    const letter = con[i]
    if (letter === '|') {
      set.add(i)
    }
  }

  const alignmentHoverPos =
    structureSeqHoverPos === undefined
      ? undefined
      : structurePositionToAlignmentMap?.[structureSeqHoverPos]

  function onMouseOver(alignmentPos: number) {
    if (alignmentToStructurePosition) {
      const structureSeqPos = alignmentToStructurePosition[alignmentPos]!
      model.setHoveredPosition({ structureSeqPos })
      hoverProteinToGenome({ model, structureSeqPos })
    }
  }
  function onClick(alignmentPos: number) {
    if (alignmentToStructurePosition) {
      const structureSeqPos = alignmentToStructurePosition[alignmentPos]!
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
          <Tooltip title="This is the sequence of the protein from the structure file">
            <span>STRUCT&nbsp;</span>
          </Tooltip>
          <SplitString
            str={a0}
            showHighlight={showHighlight}
            col={alignmentHoverPos}
            set={set}
            onMouseOver={onMouseOver}
            onClick={onClick}
          />
        </div>
        <div>
          <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <SplitString
            showHighlight={showHighlight}
            str={con}
            col={alignmentHoverPos}
            set={set}
            onMouseOver={onMouseOver}
            onClick={onClick}
          />
        </div>
        <div>
          <Tooltip title="This is the sequence of the protein from the reference genome transcript">
            <span>GENOME&nbsp;</span>
          </Tooltip>
          <SplitString
            str={a1}
            col={alignmentHoverPos}
            showHighlight={showHighlight}
            set={set}
            onMouseOver={onMouseOver}
            onClick={onClick}
          />
        </div>
      </div>
    </div>
  )
})

export default ProteinAlignment
