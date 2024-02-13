import React from 'react'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'
import { getSession } from '@jbrowse/core/util'

// locals
import { JBrowsePluginProteinViewModel } from '../ProteinView/model'

type LGV = LinearGenomeViewModel

const useStyles = makeStyles()({
  highlight: {
    height: '100%',
    background: 'rgba(255, 255, 0, 0.3)',
    position: 'absolute',
    textAlign: 'center',
    overflow: 'hidden',
    zIndex: 1000,
    pointerEvents: 'none',
  },
})

const ProteinToGenomeClickHighlight = observer(function Highlight({
  model,
}: {
  model: LGV
}) {
  const { classes } = useStyles()
  const { assemblyManager, views } = getSession(model)
  const { assemblyNames, offsetPx } = model
  const p = views.find(
    f => f.type === 'ProteinView',
  ) as JBrowsePluginProteinViewModel
  const assembly = assemblyManager.get(assemblyNames[0])
  return assembly ? (
    <>
      {p?.clickGenomeHighlights.map((r, idx) => {
        const refName = assembly.getCanonicalRefName(r.refName) ?? r.refName
        const s = model.bpToPx({ refName, coord: r.start })
        const e = model.bpToPx({ refName, coord: r.end })
        if (s && e) {
          const width = Math.max(Math.abs(e.offsetPx - s.offsetPx), 3)
          const left = Math.min(s.offsetPx, e.offsetPx) - offsetPx
          return (
            <div
              key={`${JSON.stringify(r)}-${idx}`}
              className={classes.highlight}
              style={{ left, width }}
            />
          )
        }
        return null
      })}
    </>
  ) : null
})

export default ProteinToGenomeClickHighlight
