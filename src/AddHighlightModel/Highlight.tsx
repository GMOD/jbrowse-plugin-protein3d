import React from 'react'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'
import { getSession } from '@jbrowse/core/util'
import { Assembly } from '@jbrowse/core/assemblyManager/assembly'

// locals
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

function getCanonicalName(assembly: Assembly, s: string) {
  return assembly.getCanonicalRefName(s) ?? s
}

const Highlight = observer(function Highlight({ model }: { model: LGV }) {
  const { classes } = useStyles()
  const { assemblyManager, views } = getSession(model)
  const p = views.find(f => f.type === 'ProteinView') as ProteinViewModel
  const assembly = assemblyManager.get(model.assemblyNames[0])
  return assembly ? (
    <>
      {p?.highlights.map((r, idx) => {
        const refName = getCanonicalName(assembly, r.refName)
        const s = model.bpToPx({ refName, coord: r.start })
        const e = model.bpToPx({ refName, coord: r.end })
        if (s && e) {
          const width = Math.max(Math.abs(e.offsetPx - s.offsetPx), 3)
          const left = Math.min(s.offsetPx, e.offsetPx) - model.offsetPx
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

export default Highlight
