import React from 'react'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'

// locals
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'
import { getSession } from '@jbrowse/core/util'
import { ProteinViewModel } from '../ProteinView/model'

type LGV = LinearGenomeViewModel

const useStyles = makeStyles()({
  highlight: {
    height: '100%',
    background: 'rgba(255, 255, 0, 0.3)',
    position: 'absolute',
    textAlign: 'center',
    overflow: 'hidden',
  },
})

export default observer(function Highlight({ model }: { model: LGV }) {
  const { classes } = useStyles()
  const { views } = getSession(model)
  const p = views.find(f => f.type === 'ProteinView') as ProteinViewModel
  return (
    <>
      {p?.highlights
        .map(r => {
          const s = model.bpToPx({ refName: r.refName, coord: r.start })
          const e = model.bpToPx({ refName: r.refName, coord: r.end })
          return s && e
            ? {
                width: Math.max(Math.abs(e.offsetPx - s.offsetPx), 3),
                left: Math.min(s.offsetPx, e.offsetPx) - model.offsetPx,
              }
            : undefined
        })
        .filter((f): f is { width: number; left: number } => !!f)
        .map(({ left, width }, idx) => (
          <div
            key={`${left}_${width}_${idx}`}
            className={classes.highlight}
            style={{ left, width }}
          />
        ))}
    </>
  )
})
