import { autorun } from 'mobx'
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
import {
  StructureElement,
  StructureProperties,
} from 'molstar/lib/mol-model/structure'
import {
  clickProteinToGenome,
  hoverProteinToGenome,
} from './proteinToGenomeMapping'
import selectResidue from './selectResidue'
import clearSelection from './clearSelection'
import highlightResidue from './highlightResidue'

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
    /**
     * #volatile
     */
    structureSequences: undefined as string[] | undefined,
  }))
  .actions(self => ({
    /**
     * #action
     */
    setModel(model: StructureModel) {
      self.model = model
    },

    setSequences(str?: string[]) {
      self.structureSequences = str
    },
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
      return r === undefined ? '' : toStr(r)
    },
    /**
     * #getter
     */
    get hoverString() {
      const r = self.hoverPosition
      return r === undefined ? '' : toStr(r)
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
    get molstarPluginContext(): PluginContext | undefined {
      // @ts-expect-error
      return getParent(self, 2).molstarPluginContext
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
              // @ts-expect-error
              getParent(self, 2).setShowHighlight(true)
              // @ts-expect-error
              getParent(self, 2).setShowAlignment(true)
            }
          } catch (e) {
            console.error(e)
            // @ts-expect-error
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
            connectedView?.initialized &&
            genomeToTranscriptSeqMapping &&
            checkHovered(hovered)
          ) {
            const { hoverPosition } = hovered
            const pos = genomeToTranscriptSeqMapping.g2p[hoverPosition.coord]
            const c0 =
              pos === undefined
                ? undefined
                : transcriptSeqToStructureSeqPosition?.[pos]

            if (c0 !== undefined) {
              self.setHoveredPosition({
                structureSeqPos: c0,
              })
            }
          }
        }),
      )

      addDisposer(
        self,
        autorun(() => {
          const { molstarPluginContext } = self
          if (molstarPluginContext) {
            const ret =
              molstarPluginContext.behaviors.interaction.click.subscribe(e => {
                if (StructureElement.Loci.is(e.current.loci)) {
                  const loc = StructureElement.Loci.getFirstLocation(
                    e.current.loci,
                  )
                  if (loc) {
                    const pos = StructureProperties.residue.auth_seq_id(loc)
                    const code = StructureProperties.atom.label_comp_id(loc)
                    const chain = StructureProperties.chain.auth_asym_id(loc)
                    self.setHoveredPosition({
                      structureSeqPos: pos - 1,
                      code,
                      chain,
                    })

                    clickProteinToGenome({
                      model: self as JBrowsePluginProteinStructureModel,
                      structureSeqPos: pos - 1,
                    }).catch((e: unknown) => {
                      console.error(e)
                      // @ts-expect-error
                      getParent(self, 2).setError(e)
                    })
                  }
                }
              })
            return () => {
              ret.unsubscribe()
            }
          }
          return () => {}
        }),
      )

      addDisposer(
        self,
        autorun(() => {
          const { molstarPluginContext } = self
          if (molstarPluginContext) {
            const ret =
              molstarPluginContext.behaviors.interaction.hover.subscribe(e => {
                if (StructureElement.Loci.is(e.current.loci)) {
                  const loc = StructureElement.Loci.getFirstLocation(
                    e.current.loci,
                  )
                  if (loc) {
                    // example code for this label
                    // https://github.com/molstar/molstar/blob/60550cfea1f62a50a764d5714307d6d1049be71d/src/mol-theme/label.ts#L255-L264
                    const pos = StructureProperties.residue.auth_seq_id(loc)
                    const code = StructureProperties.atom.label_comp_id(loc)
                    const chain = StructureProperties.chain.auth_asym_id(loc)
                    self.setHoveredPosition({
                      structureSeqPos: pos - 1,
                      code,
                      chain,
                    })
                    hoverProteinToGenome({
                      model: self as JBrowsePluginProteinStructureModel,
                      structureSeqPos: pos - 1,
                    })
                  }
                }
              })
            return () => {
              ret.unsubscribe()
            }
          }
          return () => {}
        }),
      )

      addDisposer(
        self,
        autorun(() => {
          const {
            showHighlight,
            structureSeqToTranscriptSeqPosition,
            molstarPluginContext,
          } = self
          const structure =
            molstarPluginContext?.managers.structure.hierarchy.current
              .structures[0]?.cell.obj?.data
          if (structure && structureSeqToTranscriptSeqPosition) {
            if (showHighlight) {
              for (const coord of Object.keys(
                structureSeqToTranscriptSeqPosition,
              )) {
                selectResidue({
                  structure,
                  plugin: molstarPluginContext,
                  selectedResidue: +coord + 1,
                })
              }
            } else {
              clearSelection({
                plugin: molstarPluginContext,
              })
            }
          }
        }),
      )

      addDisposer(
        self,
        autorun(() => {
          const { structureSeqHoverPos, molstarPluginContext } = self
          const structure =
            molstarPluginContext?.managers.structure.hierarchy.current
              .structures[0]?.cell.obj?.data
          if (structure) {
            if (structureSeqHoverPos === undefined) {
              console.warn('not found')
            } else {
              highlightResidue({
                structure,
                plugin: molstarPluginContext,
                selectedResidue: structureSeqHoverPos,
              })
            }
          }
        }),
      )
    },
  }))

export default Structure

export type JBrowsePluginProteinStructureStateModel = typeof Structure
export type JBrowsePluginProteinStructureModel =
  Instance<JBrowsePluginProteinStructureStateModel>
