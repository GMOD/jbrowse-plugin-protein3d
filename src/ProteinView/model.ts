import { BaseViewModel } from '@jbrowse/core/pluggableElementTypes'
import { ElementId, Region } from '@jbrowse/core/util/types/mst'
import { Region as IRegion } from '@jbrowse/core/util/types'
import { Instance, cast, types } from 'mobx-state-tree'
import { proteinAbbreviationMapping } from './util'

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

export interface Mapping {
  refName: string
  featureStart: number
  featureEnd: number
  pdbId: string
  proteinStart: number
  proteinEnd: number
  strand: number
}

function stateModelFactory() {
  return types
    .compose(
      BaseViewModel,
      types.model({
        id: ElementId,
        type: types.literal('ProteinView'),
        url: types.optional(types.string, root + '1LOL.cif'),
        mapping: types.frozen<Mapping[]>(),
        highlights: types.array(Region),
        showControls: false,
      }),
    )
    .volatile(() => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mouseClickedPosition: undefined as
        | { pos: number; code: string; chain: string }
        | undefined,
    }))
    .actions(self => ({
      setShowControls(arg: boolean) {
        self.showControls = arg
      },
      setMouseClickedPosition(arg?: {
        pos: number
        code: string
        chain: string
      }) {
        self.mouseClickedPosition = arg
      },
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
    .views(self => ({
      get mouseClickedString() {
        if (self.mouseClickedPosition) {
          const { pos, code, chain } = self.mouseClickedPosition
          return [
            `Position: ${pos}`,
            `Letter: ${code} (${proteinAbbreviationMapping[code]?.singleLetterCode})`,
            `Chain: ${chain}`,
          ].join(', ')
        } else {
          return ''
        }
      },
    }))
}

export default stateModelFactory
export type ProteinViewStateModel = ReturnType<typeof stateModelFactory>
export type ProteinViewModel = Instance<ProteinViewStateModel>
