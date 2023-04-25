import { BaseViewModel } from '@jbrowse/core/pluggableElementTypes'
import { ElementId, Region } from '@jbrowse/core/util/types/mst'
import { Region as IRegion } from '@jbrowse/core/util/types'
import { Instance, cast, types } from 'mobx-state-tree'

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
  return types
    .compose(
      BaseViewModel,
      types.model({
        id: ElementId,
        type: types.literal('ProteinView'),
        url: types.optional(types.string, root + '1LOL.cif'),
        mapping: types.maybe(types.string),
        highlights: types.array(Region),
      }),
    )
    .actions((self) => ({
      setHighlights(r: IRegion[]) {
        self.highlights = cast(r)
      },
      addToHighlights(r: IRegion) {
        self.highlights.push(r)
      },
      clearHighlights() {
        self.highlights = cast([])
      },
    }))
}

export default stateModelFactory
export type ProteinViewStateModel = ReturnType<typeof stateModelFactory>
export type ProteinViewModel = Instance<ProteinViewStateModel>
