import React from 'react'

import { getSession } from '@jbrowse/core/util'
import { observer } from 'mobx-react'

import Highlight from './Highlight'
import { JBrowsePluginProteinViewModel } from '../ProteinView/model'

import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

const ProteinToGenomeHoverHighlight = observer(function ProteinToGenomeHoverHighlight({
  model,
}: {
  model: LinearGenomeViewModel
}) {
  const { assemblyManager, views } = getSession(model)
  const { assemblyNames } = model
  const proteinView = views.find(f => f.type === 'ProteinView') as
    | JBrowsePluginProteinViewModel
    | undefined
  const assemblyName = assemblyNames[0]!
  const assembly = assemblyManager.get(assemblyName)
  return assembly ? (
    <>
      {proteinView?.structures.map(structure =>
        structure.hoverGenomeHighlights.map((r, idx) => (
          <Highlight
            key={`${JSON.stringify(r)}-${idx}`}
            start={r.start}
            end={r.end}
            refName={r.refName}
            assemblyName={assemblyName}
            model={model}
          />
        )),
      )}
    </>
  ) : null
})

export default ProteinToGenomeHoverHighlight
