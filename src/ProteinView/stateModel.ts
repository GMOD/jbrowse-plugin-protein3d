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

const stateModel = types
  .model({
    id: ElementId,
    type: types.literal('ProteinView'),
    structures: types.array(StructureModel),
    selection: types.optional(types.string, ''),
    mouseCol: types.optional(types.number, 0),
  })
  .actions(() => ({
    // unused but required by your view
    setWidth() {},

    setMouseoveredColumn(n: number, chain: string, file: string) {},
  }))

export default stateModel
export type ProteinViewModel = Instance<typeof stateModel>
