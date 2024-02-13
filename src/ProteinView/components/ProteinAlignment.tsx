import React from 'react'
import { observer } from 'mobx-react'
import { Tooltip, Typography } from '@mui/material'

// locals
import { JBrowsePluginProteinViewModel } from '../model'
import HelpButton from './HelpButton'
import { clickProteinToGenome } from '../proteinToGenomeMapping'

function SplitString({
  str,
  col,
  set,
  onMouseOver,
  onClick,
}: {
  str: string
  col?: number
  set?: Set<number>
  onMouseOver?: (arg: number) => void
  onClick?: (arg: number) => void
}) {
  return str.split('').map((d, i) => (
    <span
      key={`${d}-${i}`}
      onMouseOver={() => onMouseOver?.(i)}
      onClick={() => onClick?.(i)}
      style={{
        background:
          col !== undefined && i === col
            ? '#f69'
            : set?.has(i)
              ? '#33ff19'
              : undefined,
      }}
    >
      {d === ' ' ? <>&nbsp;</> : d}
    </span>
  ))
}

const ProteinAlignment = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { mouseCol2, alignment, pairwiseSeqMap } = model

  const a0 = alignment!.alns[0].seq as string
  const a1 = alignment!.alns[1].seq as string
  const con = alignment!.consensus
  const ret = pairwiseSeqMap?.coord1
  const set =
    ret !== undefined ? new Set(Object.keys(ret).map(f => +f)) : undefined

  return (
    <div>
      <HelpButton />
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
      >
        <div>
          <Tooltip title="This is the sequence of the protein from the structure file">
            <span>STRUCT&nbsp;</span>
          </Tooltip>
          <SplitString
            str={a0}
            col={mouseCol2}
            set={set}
            onMouseOver={pos => model.setHoveredPosition({ pos })}
            onClick={pos => {
              clickProteinToGenome({ model, pos }).catch(e => {
                console.error(e)
              })
            }}
          />
        </div>
        <div>
          <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <SplitString
            str={con}
            col={mouseCol2}
            set={set}
            onMouseOver={pos => model.setHoveredPosition({ pos })}
            onClick={pos => {
              clickProteinToGenome({ model, pos }).catch(e => {
                console.error(e)
              })
            }}
          />
        </div>
        <div>
          <Tooltip title="This is the sequence of the protein from the reference genome transcript">
            <span>GENOME&nbsp;</span>
          </Tooltip>
          <SplitString
            str={a1}
            col={mouseCol2}
            set={set}
            onMouseOver={pos => model.setHoveredPosition({ pos })}
            onClick={pos => {
              clickProteinToGenome({ model, pos }).catch(e => {
                console.error(e)
              })
            }}
          />
        </div>
      </div>
    </div>
  )
})

export default ProteinAlignment
