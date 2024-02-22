import React from 'react'
import { observer } from 'mobx-react'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'
import { getSession } from '@jbrowse/core/util'

// locals
import { JBrowsePluginProteinViewModel } from '../ProteinView/model'
import Highlight from './Highlight'

type LGV = LinearGenomeViewModel

const ProteinToGenomeClickHighlight = observer(function ({
  model,
}: {
  model: LGV
}) {
  const { assemblyManager, views } = getSession(model)
  const { assemblyNames } = model
  const p = views.find(
    f => f.type === 'ProteinView',
  ) as JBrowsePluginProteinViewModel
  const assembly = assemblyManager.get(assemblyNames[0])
  return assembly ? (
    <>
      {p?.clickGenomeHighlights.map((r, idx) => (
        <Highlight
          key={`${JSON.stringify(r)}-${idx}}`}
          start={r.start}
          end={r.end}
          refName={r.refName}
          assemblyName={assemblyNames[0]}
          model={model}
        />
      ))}
    </>
  ) : null
})

export default ProteinToGenomeClickHighlight
