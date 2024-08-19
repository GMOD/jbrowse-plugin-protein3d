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
import { checkHovered, invertMap, toStr } from './util'
import { launchPairwiseAlignment } from './launchRemotePairwiseAlignment'
import {
  structureSeqVsTranscriptSeqMap,
  genomeToTranscriptSeqMapping,
  structurePositionToAlignmentMap,
  transcriptPositionToAlignmentMap,
} from '../mappings'

type LGV = LinearGenomeViewModel
type MaybeLGV = LGV | undefined

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
         * url to structure file
         */
        url: types.maybe(types.string),
        /**
         * #property
         * full string for structure data
         */
        data: types.maybe(types.string),
        /**
         * #property
         */
        clickGenomeHighlights: types.array(Region),
        /**
         * #property
         */
        hoverGenomeHighlights: types.array(Region),
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
        feature: types.frozen<SimpleFeatureSerialized | undefined>(),
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
      error: undefined as unknown,
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
      setShowAlignment(f: boolean) {
        self.showAlignment = f
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
        self.clickGenomeHighlights = cast(r)
      },
      /**
       * #action
       */
      clearClickGenomeHighlights() {
        self.clickGenomeHighlights = cast([])
      },
      /**
       * #action
       */
      setHoverGenomeHighlights(r: IRegion[]) {
        self.hoverGenomeHighlights = cast(r)
      },
      /**
       * #action
       */
      clearHoverGenomeHighlights() {
        self.hoverGenomeHighlights = cast([])
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

      get exactMatch() {
        const r1 = self.seq1?.replaceAll('*', '')
        const r2 = self.seq2?.replaceAll('*', '')
        return r1 === r2
      },
    }))
    .actions(self => ({
      afterAttach() {
        // pairwise align transcript sequence to structure residues
        addDisposer(
          self,
          autorun(async () => {
            try {
              const { seq1, seq2, exactMatch } = self
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
                    self.setProgress(arg)
                  },
                })
                self.setAlignment(alignment.alignment)

                // showHighlight when we are
                self.setShowHighlight(true)
                self.setShowAlignment(true)
              }
            } catch (e) {
              console.error(e)
              self.setError(e)
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
}

export default stateModelFactory
export type JBrowsePluginProteinViewStateModel = ReturnType<
  typeof stateModelFactory
>
export type JBrowsePluginProteinViewModel =
  Instance<JBrowsePluginProteinViewStateModel>
