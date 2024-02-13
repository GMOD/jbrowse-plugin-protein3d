import React, { useEffect } from 'react'
import { observer } from 'mobx-react'

// locals

import { JBrowsePluginProteinViewModel } from '../model'

const ProteinAlignment = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { mouseCol2, alignment } = model
  const a0 = alignment!.alns[0].seq as string
  const a1 = alignment!.alns[1].seq as string
  const con = alignment!.consensus

  useEffect(() => {
    document.querySelector(`#${a0}-${mouseCol2}`)?.scrollIntoView()
  }, [mouseCol2, a0])
  return (
    <div
      style={{
        fontSize: 9,
        fontFamily: 'monospace',
        margin: 8,
        overflow: 'auto',
        whiteSpace: 'nowrap',
      }}
    >
      <div>
        {a0.split('').map((d, i) => (
          <span
            key={`${d}-${i}`}
            id={`${d}-${i}`}
            style={{ background: i === mouseCol2 ? '#0f0' : undefined }}
          >
            {d}
          </span>
        ))}
      </div>
      <div>
        {con.split('').map((d, i) => (
          <span
            key={`${d}-${i}`}
            style={{ background: i === mouseCol2 ? '#0f0' : undefined }}
          >
            {d}
          </span>
        ))}
      </div>
      <div>
        {a1.split('').map((d, i) => (
          <span
            key={`${d}-${i}`}
            style={{ background: i === mouseCol2 ? '#0f0' : undefined }}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  )
})

export default ProteinAlignment
