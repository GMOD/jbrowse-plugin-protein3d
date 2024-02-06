import { BaseViewModel } from '@jbrowse/core/pluggableElementTypes'
import { ElementId, Region } from '@jbrowse/core/util/types/mst'
import { Region as IRegion } from '@jbrowse/core/util/types'
import { Instance, addDisposer, cast, types } from 'mobx-state-tree'
import { proteinAbbreviationMapping } from './util'
import { SimpleFeature, SimpleFeatureSerialized } from '@jbrowse/core/util'
import { generateMap } from '../LaunchProteinView/util'
import { launchPairwiseAlignment } from './components/pairwiseAlignmentUtils'
import { autorun } from 'mobx'

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
        /**
         * #property
         */
        id: ElementId,
        /**
         * #property
         */
        type: types.literal('ProteinView'),
        /**
         * #property
         */
        url: types.optional(types.string, root + '1LOL.cif'),
        /**
         * #property
         */
        highlights: types.array(Region),
        /**
         * #property
         */
        showControls: false,
        /**
         * #property
         */
        height: types.optional(types.number, 500),
        /**
         * #property
         */
        feature: types.frozen<SimpleFeatureSerialized>(),
        /**
         * #property
         */
        seq1: types.maybe(types.string),
        /**
         * #property
         */
        seq2: types.maybe(types.string),
      }),
    )
    .volatile(() => ({
      alignment: undefined as any,
      error: undefined as unknown,

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mouseClickedPosition: undefined as
        | { pos: number; code: string; chain: string }
        | undefined,
    }))
    .actions(self => ({
      setSeqs(str1?: string, str2?: string) {
        self.seq1 = str1
        self.seq2 = str2
      },
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
      setError(e: unknown) {
        self.error = e
      },
      setAlignment(r: unknown) {
        self.alignment = r
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

      get mapping() {
        return self.alignment
          ? generateMap(new SimpleFeature(self.feature), 'lol', self.alignment)
          : undefined
      },
    }))
    .actions(self => ({
      afterAttach() {
        addDisposer(
          self,
          autorun(async () => {
            try {
              const { seq1, seq2 } = self
              if (!seq1 || !seq2) {
                return
              }
              const alignment = await launchPairwiseAlignment({
                seq1,
                seq2,
                algorithm: 'emboss_needle',
                onProgress: () => {},
              })
              self.setAlignment(alignment.alignment)
            } catch (e) {
              console.error(e)
              self.setError(e)
            }
          }),
        )
      },
    }))
}

export default stateModelFactory
export type ProteinViewStateModel = ReturnType<typeof stateModelFactory>
export type ProteinViewModel = Instance<ProteinViewStateModel>
