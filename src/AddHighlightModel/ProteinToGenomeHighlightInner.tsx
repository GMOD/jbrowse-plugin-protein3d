import React from 'react'

import { getSession } from '@jbrowse/core/util'
import { observer } from 'mobx-react'

import Highlight from './Highlight'

import type {
  JBrowsePluginProteinStructureModel,
  JBrowsePluginProteinViewModel,
} from '../ProteinView/model'
import type { Region } from '@jbrowse/core/util/types'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

type HighlightField = 'clickGenomeHighlights' | 'hoverGenomeHighlights'

const ProteinToGenomeHighlightInner = observer(
  function ProteinToGenomeHighlightInner({
    model,
    field,
  }: {
    model: LinearGenomeViewModel
    field: HighlightField
  }) {
    const { assemblyManager, views } = getSession(model)
    const { assemblyNames } = model
    const proteinView = views.find(f => f.type === 'ProteinView') as
      | JBrowsePluginProteinViewModel
      | undefined
    const assemblyName = assemblyNames[0]
    const assembly = assemblyName
      ? assemblyManager.get(assemblyName)
      : undefined
    return assembly && assemblyName ? (
      <>
        {proteinView?.structures.map(
          (structure: JBrowsePluginProteinStructureModel, idx: number) =>
            structure[field].map((r: Region, idx2: number) => (
              <Highlight
                key={`${r.refName}-${r.start}-${r.end}-${idx}-${idx2}`}
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
  },
)

export default ProteinToGenomeHighlightInner
