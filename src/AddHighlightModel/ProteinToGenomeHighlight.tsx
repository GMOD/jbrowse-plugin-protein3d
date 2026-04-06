import React from 'react'

import { getSession } from '@jbrowse/core/util'
import { observer } from 'mobx-react'

import Highlight from './Highlight'
import {
  JBrowsePluginProteinStructureModel,
  JBrowsePluginProteinViewModel,
} from '../ProteinView/model'

import type { Region } from '@jbrowse/core/util/types'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

type HighlightField = 'clickGenomeHighlights' | 'hoverGenomeHighlights'

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
  const assemblyName = assemblyNames[0]!
  const assembly = assemblyManager.get(assemblyName)
  return assembly ? (
    <>
      {proteinView?.structures.map(
        (structure: JBrowsePluginProteinStructureModel, idx: number) =>
          structure[field].map((r: Region, idx2: number) => (
            <Highlight
              key={`${JSON.stringify(r)}-${idx}-${idx2}`}
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
}

export const ProteinToGenomeClickHighlight = observer(
  function ProteinToGenomeClickHighlight({
    model,
  }: {
    model: LinearGenomeViewModel
  }) {
    return <ProteinToGenomeHighlightInner model={model} field="clickGenomeHighlights" />
  },
)

export const ProteinToGenomeHoverHighlight = observer(
  function ProteinToGenomeHoverHighlight({
    model,
  }: {
    model: LinearGenomeViewModel
  }) {
    return <ProteinToGenomeHighlightInner model={model} field="hoverGenomeHighlights" />
  },
)
