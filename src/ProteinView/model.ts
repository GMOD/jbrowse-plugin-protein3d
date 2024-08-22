import { autorun } from 'mobx'
import { BaseViewModel } from '@jbrowse/core/pluggableElementTypes'
import { ElementId } from '@jbrowse/core/util/types/mst'
import { Region as IRegion } from '@jbrowse/core/util/types'
import { Instance, addDisposer, getParent, types } from 'mobx-state-tree'
import {
  SimpleFeature,
  SimpleFeatureSerialized,
  getSession,
} from '@jbrowse/core/util'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// locals
import { checkHovered, invertMap, toStr } from './util'
import { launchPairwiseAlignment } from './launchRemotePairwiseAlignment'
import {
  structureSeqVsTranscriptSeqMap,
  genomeToTranscriptSeqMapping,
  structurePositionToAlignmentMap,
  transcriptPositionToAlignmentMap,
  PairwiseAlignment,
} from '../mappings'
import { PluginContext } from 'molstar/lib/mol-plugin/context'

type LGV = LinearGenomeViewModel
type MaybeLGV = LGV | undefined
type MaybePairwiseAlignment = PairwiseAlignment | undefined
type StructureModel = Awaited<
  ReturnType<PluginContext['builders']['structure']['createModel']>
>

const Structure = types
  .model({
    /**
     * #property
     */
    url: types.maybe(types.string),
    /**
     * #property
     */
    data: types.maybe(types.string),
    /**
     * #property
     */
    connectedViewId: types.maybe(types.string),
    /**
     * #property
     */
    alignment: types.frozen<MaybePairwiseAlignment>(),
    /**
     * #property
     */
    feature: types.frozen<SimpleFeatureSerialized | undefined>(),
    /**
     * #property
     */
    userProvidedTranscriptSequence: types.string,
  })
  .volatile(() => ({
    /**
     * #volatile
     */
    model: undefined as StructureModel | undefined,
    /**
     * #volatile
     */
    clickGenomeHighlights: [] as IRegion[],
    /**
     * #volatile
     */
    hoverGenomeHighlights: [] as IRegion[],

    /**
     * #volatile
     */
    clickPosition: undefined as
      | {
          structureSeqPos: number
          code: string
          chain: string
        }
      | undefined,
    /**
     * #volatile
     */
    hoverPosition: undefined as
      | {
          structureSeqPos: number
          code?: string
          chain?: string
        }
      | undefined,
    /**
     * #volatile
     */
    alignmentStatus: '',
  }))
  .actions(self => ({
    /**
     * #action
     */
    setModel(model: StructureModel) {
      self.model = model
    },
  }))
  .views(self => ({
    /**
     * #getter
     */
    get structureSequences() {
      return self.model?.obj?.data.sequence.sequences.map(s => {
        let seq = ''
        const arr = s.sequence.label.toArray()
        // eslint-disable-next-line unicorn/no-for-loop,@typescript-eslint/prefer-for-of
        for (let i = 0; i < arr.length; i++) {
          seq += arr[i]!
        }
        return seq
      })
    },
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
    setClickedPosition(arg?: {
      structureSeqPos: number
      code: string
      chain: string
    }) {
      self.clickPosition = arg
    },
    /**
     * #action
     */
    setClickGenomeHighlights(r: IRegion[]) {
      self.clickGenomeHighlights = r
    },
    /**
     * #action
     */
    clearClickGenomeHighlights() {
      self.clickGenomeHighlights = []
    },
    /**
     * #action
     */
    setHoverGenomeHighlights(r: IRegion[]) {
      self.hoverGenomeHighlights = r
    },
    /**
     * #action
     */
    clearHoverGenomeHighlights() {
      self.hoverGenomeHighlights = []
    },
    /**
     * #action
     */
    setHoveredPosition(arg?: {
      structureSeqPos: number
      chain?: string
      code?: string
    }) {
      self.hoverPosition = arg
    },
    /**
     * #action
     */
    setAlignment(r?: PairwiseAlignment) {
      self.alignment = r
    },
    /**
     * #action
     */
    setAlignmentStatus(str: string) {
      self.alignmentStatus = str
    },
  }))
  .views(self => ({
    /**
     * #getter
     */
    get structureSeqToTranscriptSeqPosition() {
      return self.alignment
        ? structureSeqVsTranscriptSeqMap(self.alignment)
            .structureSeqToTranscriptSeqPosition
        : undefined
    },
    /**
     * #getter
     */
    get transcriptSeqToStructureSeqPosition() {
      return self.alignment
        ? structureSeqVsTranscriptSeqMap(self.alignment)
            .transcriptSeqToStructureSeqPosition
        : undefined
    },
    /**
     * #getter
     */
    get structurePositionToAlignmentMap() {
      return self.alignment
        ? structurePositionToAlignmentMap(self.alignment)
        : undefined
    },
    /**
     * #getter
     */
    get transcriptPositionToAlignmentMap() {
      return self.alignment
        ? transcriptPositionToAlignmentMap(self.alignment)
        : undefined
    },
    /**
     * #getter
     */
    get alignmentToTranscriptPosition() {
      return this.transcriptPositionToAlignmentMap
        ? invertMap(this.transcriptPositionToAlignmentMap)
        : undefined
    },
    /**
     * #getter
     */
    get alignmentToStructurePosition() {
      return this.structurePositionToAlignmentMap
        ? invertMap(this.structurePositionToAlignmentMap)
        : undefined
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
    get genomeToTranscriptSeqMapping() {
      return self.feature
        ? genomeToTranscriptSeqMapping(new SimpleFeature(self.feature))
        : undefined
    },
    /**
     * #getter
     */
    get structureSeqHoverPos(): number | undefined {
      return self.hoverPosition?.structureSeqPos
    },

    /**
     * #getter
     */
    get exactMatch() {
      const r1 = self.userProvidedTranscriptSequence.replaceAll('*', '')
      const r2 = self.structureSequences?.[0]?.replaceAll('*', '')
      return r1 === r2
    },
    get zoomToBaseLevel(): boolean {
      // @ts-expect-error
      return getParent(self, 2).zoomToBaseLevel
    },
    get showHighlight(): boolean {
      // @ts-expect-error
      return getParent(self, 2).showHighlight
    },
  }))
  .actions(self => ({
    afterAttach() {
      // pairwise align transcript sequence to structure residues
      addDisposer(
        self,
        autorun(async () => {
          try {
            const {
              userProvidedTranscriptSequence,
              structureSequences,
              exactMatch,
            } = self
            const seq1 = userProvidedTranscriptSequence
            const seq2 = structureSequences?.[0]
            if (!!self.alignment || !seq1 || !seq2) {
              return
            }
            const r1 = seq1.replaceAll('*', '')
            const r2 = seq2.replaceAll('*', '')
            if (exactMatch) {
              let consensus = ''
              // eslint-disable-next-line @typescript-eslint/prefer-for-of
              for (let i = 0; i < r1.length; i++) {
                consensus += '|'
              }
              self.setAlignment({
                consensus,
                alns: [
                  { id: 'seq1', seq: r1 },
                  { id: 'seq2', seq: r2 },
                ],
              })
            } else {
              const alignment = await launchPairwiseAlignment({
                seq1: r1,
                seq2: r2,
                algorithm: 'emboss_needle',
                onProgress: arg => {
                  self.setAlignmentStatus(arg)
                },
              })
              self.setAlignment(alignment.alignment)

              // showHighlight when we are
              getParent(self, 2).setShowHighlight(true)
              getParent(self, 2).setShowAlignment(true)
            }
          } catch (e) {
            console.error(e)
            getParent(self, 2).setError(e)
          }
        }),
      )

      // convert hover over the genome to structure position
      addDisposer(
        self,
        autorun(() => {
          const { hovered } = getSession(self)
          const {
            transcriptSeqToStructureSeqPosition,
            genomeToTranscriptSeqMapping,
            connectedView,
          } = self
          if (
            !connectedView?.initialized ||
            !genomeToTranscriptSeqMapping ||
            !checkHovered(hovered)
          ) {
            return undefined
          }

          const pos =
            genomeToTranscriptSeqMapping.g2p[hovered.hoverPosition.coord]
          const c0 = pos
            ? transcriptSeqToStructureSeqPosition?.[pos]
            : undefined
          if (c0 !== undefined) {
            self.setHoveredPosition({
              structureSeqPos: c0,
            })
          }
        }),
      )
    },
  }))

/**
 * #stateModel Protein3dViewPlugin
 * extends
 * - BaseViewModel
 */
function stateModelFactory() {
  return types
    .compose(
      'ProteinView',
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
        structures: types.array(Structure),

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
        showHighlight: false,
        /**
         * #property
         */
        zoomToBaseLevel: true,
        /**
         * #property
         */
        showAlignment: false,
      }),
    )
    .volatile(() => ({
      /**
       * #volatile
       */
      progress: '',
      error: undefined as unknown,
    }))

    .actions(self => ({
      /**
       * #action
       */
      setShowAlignment(f: boolean) {
        self.showAlignment = f
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
      setError(e: unknown) {
        self.error = e
      },

      /**
       * #action
       */
      setShowHighlight(arg: boolean) {
        self.showHighlight = arg
      },
      /**
       * #action
       */
      setZoomToBaseLevel(arg: boolean) {
        self.zoomToBaseLevel = arg
      },
    }))
}

export default stateModelFactory

export type JBrowsePluginProteinViewStateModel = ReturnType<
  typeof stateModelFactory
>
export type JBrowsePluginProteinViewModel =
  Instance<JBrowsePluginProteinViewStateModel>

export type JBrowsePluginProteinStructureStateModel = typeof Structure
export type JBrowsePluginProteinStructureModel =
  Instance<JBrowsePluginProteinStructureStateModel>
