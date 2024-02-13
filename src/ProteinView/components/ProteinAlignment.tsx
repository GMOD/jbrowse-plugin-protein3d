import React, { Suspense, lazy, useState } from 'react'
import { observer } from 'mobx-react'
import { IconButton, Tooltip } from '@mui/material'

// locals
import { JBrowsePluginProteinViewModel } from '../model'
import { Help } from '@mui/icons-material'

const HelpDialog = lazy(() => import('./HelpDialog'))

const ProteinAlignment = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const {
    mouseCol2,
    pairwiseSeqMap,
    alignment,
    transcriptToProteinMap = { p2g: {} },
  } = model

  const a0 = alignment!.alns[0].seq as string
  const a1 = alignment!.alns[1].seq as string
  const con = alignment!.consensus
  const [open, setOpen] = useState(false)

  const ret = Object.keys(transcriptToProteinMap.p2g)
    .map(s => +s)
    .sort((a, b) => a - b)
  console.log({ ret })

  function c(i: number) {
    const c0 =
      mouseCol2 !== undefined ? pairwiseSeqMap?.coord2[mouseCol2] : undefined
    return c0 !== undefined && i === c0 ? '#0f0' : undefined
  }
  console.log({ mouseCol2 })

  return (
    <div>
      <IconButton style={{ float: 'right' }} onClick={() => setOpen(true)}>
        <Help />
      </IconButton>
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
        {open ? (
          <Suspense fallback={null}>
            <HelpDialog handleClose={() => setOpen(false)} />
          </Suspense>
        ) : null}
      </div>
    </div>
  )
})

export default ProteinAlignment
