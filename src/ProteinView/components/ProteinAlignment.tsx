import React from 'react'
import { observer } from 'mobx-react'
import { Tooltip } from '@mui/material'

// locals
import { JBrowsePluginProteinViewModel } from '../model'
import HelpButton from './HelpButton'

const ProteinAlignment = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { mouseCol2, pairwiseSeqMap, alignment } = model

  const a0 = alignment!.alns[0].seq as string
  const a1 = alignment!.alns[1].seq as string
  const con = alignment!.consensus

  function c(i: number) {
    const c0 =
      mouseCol2 !== undefined ? pairwiseSeqMap?.coord2[mouseCol2] : undefined
    return c0 !== undefined && i === c0 ? '#0f0' : undefined
  }

  return (
    <div>
      <HelpButton />
      <div
        style={{
          fontSize: 9,
          fontFamily: 'monospace',
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
          {a0.split('').map((d, i) => (
            <span
              key={`${d}-${i}`}
              id={`${d}-${i}`}
              style={{ background: c(i) }}
            >
              {d}
            </span>
          ))}
        </div>
        <div>
          <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          {con.split('').map((d, i) => (
            <span key={`${d}-${i}`} style={{ background: c(i) }}>
              {d === ' ' ? <>&nbsp;</> : d}
            </span>
          ))}
        </div>
        <div>
          <Tooltip title="This is the sequence of the protein from the transcript on the genome">
            <span>GENOME&nbsp;</span>
          </Tooltip>
          {a1.split('').map((d, i) => (
            <span key={`${d}-${i}`} style={{ background: c(i) }}>
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
})

export default ProteinAlignment
