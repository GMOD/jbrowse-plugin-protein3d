import { autorun } from 'mobx'
import { BaseViewModel } from '@jbrowse/core/pluggableElementTypes'
import { ElementId, Region } from '@jbrowse/core/util/types/mst'
import { Region as IRegion } from '@jbrowse/core/util/types'
import { Instance, addDisposer, cast, types } from 'mobx-state-tree'
import {
  SimpleFeature,
  SimpleFeatureSerialized,
  getSession,
} from '@jbrowse/core/util'
import { parsePairwise } from 'clustal-js'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// locals
import { proteinAbbreviationMapping } from './util'
import { launchPairwiseAlignment } from './launchRemotePairwiseAlignment'
import { genomeToProteinMapping } from '../genomeToProteinMapping'
import { genomeToProtein } from './genomeToProtein'
import pairwiseSeqMap from '../pairwiseSeqMap'

type LGV = LinearGenomeViewModel
type MaybeLGV = LGV | undefined

function toStr(r: { pos: number; code: string; chain: string }) {
  return [
    `Position: ${r.pos}`,
    `Letter: ${r.code} (${proteinAbbreviationMapping[r.code]?.singleLetterCode})`,
    `Chain: ${r.chain}`,
  ].join(', ')
}

/**
 * #stateModel Protein3dViewPlugin
 * extends
 * - BaseViewModel
 */
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
        url: types.optional(
          types.string,
          `https://files.rcsb.org/view/1LOL.cif`,
        ),
        /**
         * #property
         */
        highlights: types.array(Region),
        /**
         * #property
         */
        showControls: true,
        /**
         * #property
         */
        height: types.optional(types.number, 650),
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
        /**
         * #property
         */
        alignment: types.frozen<ReturnType<typeof parsePairwise> | undefined>(),

        /**
         * #property
         */
        connectedViewId: types.maybe(types.string),
      }),
    )
    .volatile(() => ({
      /**
       * #volatile
       */
      error: undefined as unknown,
      /**
       * #volatile
       */
      clickPosition: undefined as
        | { pos: number; code: string; chain: string }
        | undefined,
      /**
       * #volatile
       */
      hoverPosition: undefined as
        | { pos: number; code: string; chain: string }
        | undefined,
      /**
       * #volatile
       */
      progress: '',
    }))
    .views(self => ({
      /**
       * #getter
       */
      get connectedView() {
        const { views } = getSession(self)
        return views.find(f => f.id === self.connectedViewId) as MaybeLGV
      },
    }))
    .actions(self => ({
      /**
       * #action
       */
      setHoveredPosition(arg?: { pos: number; chain: string; code: string }) {
        self.hoverPosition = arg
      },
      /**
       * #action
       */
      setSeqs(str1?: string, str2?: string) {
        self.seq1 = str1
        self.seq2 = str2
      },
      /**
       * #action
       */
      setShowControls(arg: boolean) {
        self.showControls = arg
      },
      /**
       * #action
       */
      setProgress(str: string) {
        self.progress = str
      },
      /**
       * #action
       */
      setClickedPosition(arg?: { pos: number; code: string; chain: string }) {
        self.clickPosition = arg
      },
      /**
       * #action
       */
      setHighlights(r: IRegion[]) {
        self.highlights = cast(r)
      },
      /**
       * #action
       */
      addToHighlights(r: IRegion) {
        self.highlights.push(r)
      },
      /**
       * #action
       */
      clearHighlights() {
        self.highlights = cast([])
      },
      /**
       * #action
       */
      setError(e: unknown) {
        self.error = e
      },
      /**
       * #action
       */
      setAlignment(r?: ReturnType<typeof parsePairwise>) {
        self.alignment = r
      },
    }))
    .views(self => ({
      /**
       * #getter
       */
      get pairwiseSeqMap() {
        return self.alignment ? pairwiseSeqMap(self.alignment) : undefined
      },
      /**
       * #getter
       */
      get clickString() {
        const r = self.clickPosition
        return r ? toStr(r) : ''
      },
      /**
       * #getter
       */
      get hoverString() {
        const r = self.hoverPosition
        return r ? toStr(r) : ''
      },
      /**
       * #getter
       */
      get transcriptToProteinMap() {
        return self.alignment && self.feature
          ? genomeToProteinMapping({
              feature: new SimpleFeature(self.feature),
            })
          : undefined
      },
      /**
       * #getter
       */
      get mouseCol2(): number | undefined {
        console.log(
          genomeToProtein({ model: self as JBrowsePluginProteinViewModel }),
        )
        return genomeToProtein({ model: self as JBrowsePluginProteinViewModel })
      },
    }))
    .actions(self => ({
      afterAttach() {
        addDisposer(
          self,
          autorun(async () => {
            try {
              const { seq1, seq2 } = self
              if (!!self.alignment || !seq1 || !seq2) {
                return
              }
              const alignment = await launchPairwiseAlignment({
                seq1,
                seq2,
                algorithm: 'emboss_needle',
                onProgress: arg => self.setProgress(arg),
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
export type JBrowsePluginProteinViewStateModel = ReturnType<
  typeof stateModelFactory
>
export type JBrowsePluginProteinViewModel =
  Instance<JBrowsePluginProteinViewStateModel>
