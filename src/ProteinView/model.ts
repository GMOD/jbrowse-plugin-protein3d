import { BaseViewModel } from '@jbrowse/core/pluggableElementTypes'
import { ElementId } from '@jbrowse/core/util/types/mst'
import { Instance, types } from 'mobx-state-tree'

export const StructureModel = types.model({
  id: types.identifier,
  structure: types.model({
    pdb: types.string,
    startPos: types.number,
    endPos: types.number,
  }),
  range: types.maybe(types.string),
})

const root = 'https://files.rcsb.org/view/'

function stateModelFactory() {
  return types.compose(
    BaseViewModel,
    types.model({
      id: ElementId,
      type: types.literal('ProteinView'),
      url: types.optional(types.string, root + '1LOL.cif'),
      mapping: types.maybe(types.string),
    }),
  )
}

export default stateModelFactory
export type ProteinViewStateModel = ReturnType<typeof stateModelFactory>
export type ProteinViewModel = Instance<ProteinViewStateModel>
