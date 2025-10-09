import {
  SimpleFeature,
  SimpleFeatureSerialized,
  getSession,
} from '@jbrowse/core/util'
import { Region as IRegion } from '@jbrowse/core/util/types'
import { autorun } from 'mobx'
import { type Instance, addDisposer, getParent, types } from 'mobx-state-tree'
import {
  StructureElement,
  StructureProperties,
} from 'molstar/lib/mol-model/structure'
import { PluginContext } from 'molstar/lib/mol-plugin/context'

import { launchPairwiseAlignment } from './launchRemotePairwiseAlignment'
import {
  PairwiseAlignment,
  genomeToTranscriptSeqMapping,
  structurePositionToAlignmentMap,
  structureSeqVsTranscriptSeqMap,
  transcriptPositionToAlignmentMap,
} from '../mappings'
import clearSelection from './clearSelection'
import highlightResidue from './highlightResidue'
import {
  clickProteinToGenome,
  hoverProteinToGenome,
} from './proteinToGenomeMapping'
import selectResidue from './selectResidue'
import { checkHovered, invertMap, toStr } from './util'

import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

type LGV = LinearGenomeViewModel
type MaybeLGV = LGV | undefined
type MaybePairwiseAlignment = PairwiseAlignment | undefined
type StructureModel = Awaited<
  ReturnType<PluginContext['builders']['structure']['createModel']>
>

/**
 * Extracts position information from a MolStar structure location
 * @returns Object with 0-based position, residue code, and chain ID
 */
function extractLocationInfo(location: StructureElement.Location) {
  const pos = StructureProperties.residue.auth_seq_id(location)
  const code = StructureProperties.atom.label_comp_id(location)
  const chain = StructureProperties.chain.auth_asym_id(location)
  return {
    structureSeqPos: pos - 1, // Convert to 0-based
    code,
    chain,
  }
}

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
    pairwiseAlignment: types.frozen<MaybePairwiseAlignment>(),
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
          structureSeqPos?: number
          code?: string
          chain?: string
        }
      | undefined,
    /**
     * #volatile
     */
    pairwiseAlignmentStatus: '',
    /**
     * #volatile
     */
    structureSequences: undefined as string[] | undefined,
    /**
     * #volatile
     */
    pairwiseAlignmentHoverPos: undefined as number | undefined,
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
      structureSeqPos?: number
      chain?: string
      code?: string
    }) {
      self.hoverPosition = arg
    },
    /**
     * #action
     */
    setPairwiseAlignmentHoverPos(pos?: number) {
      self.pairwiseAlignmentHoverPos = pos
    },
    /**
     * #action
     */
    setAlignment(r?: PairwiseAlignment) {
      self.pairwiseAlignment = r
    },
    /**
     * #action
     */
    setAlignmentStatus(str: string) {
      self.pairwiseAlignmentStatus = str
    },
  }))
  .views(self => ({
    /**
     * #getter
     */
    get structureSeqToTranscriptSeqPosition() {
      return self.pairwiseAlignment
        ? structureSeqVsTranscriptSeqMap(self.pairwiseAlignment)
            .structureSeqToTranscriptSeqPosition
        : undefined
    },
    /**
     * #getter
     */
    get transcriptSeqToStructureSeqPosition() {
      return self.pairwiseAlignment
        ? structureSeqVsTranscriptSeqMap(self.pairwiseAlignment)
            .transcriptSeqToStructureSeqPosition
        : undefined
    },
    /**
     * #getter
     */
    get structurePositionToAlignmentMap() {
      return self.pairwiseAlignment
        ? structurePositionToAlignmentMap(self.pairwiseAlignment)
        : undefined
    },
    /**
     * #getter
     */
    get transcriptPositionToAlignmentMap() {
      return self.pairwiseAlignment
        ? transcriptPositionToAlignmentMap(self.pairwiseAlignment)
        : undefined
    },
    /**
     * #getter
     */
    get pairwiseAlignmentToTranscriptPosition() {
      return this.transcriptPositionToAlignmentMap
        ? invertMap(this.transcriptPositionToAlignmentMap)
        : undefined
    },
    /**
     * #getter
     */
    get pairwiseAlignmentToStructurePosition() {
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
    get structureSeqHoverPos() {
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

    /**
     * #getter
     * Alignment data without hover state - only recomputes when alignment changes
     */
    get alignmentData() {
      if (!self.pairwiseAlignment) {
        return []
      }
      const a0 = self.pairwiseAlignment.alns[0].seq
      const a1 = self.pairwiseAlignment.alns[1].seq
      const con = self.pairwiseAlignment.consensus
      const result: {
        top: string
        middle: string
        bottom: string
      }[] = []

      for (let i = 0; i < con.length; i++) {
        const element = con[i]
        result.push({
          top: a0[i] ?? '',
          middle: element ?? '',
          bottom: a1[i] ?? '',
        })
      }
      return result
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

            if (!!self.pairwiseAlignment || !seq1 || !seq2) {
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
              const pairwiseAlignment = await launchPairwiseAlignment({
                seq1: r1,
                seq2: r2,
                algorithm: 'emboss_needle',
                onProgress: arg => {
                  self.setAlignmentStatus(arg)
                },
              })
              self.setAlignment(pairwiseAlignment.pairwiseAlignment)

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
            const pos =
              genomeToTranscriptSeqMapping.g2p[hoverPosition.coord - 1]
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
                    const locationInfo = extractLocationInfo(loc)
                    self.setHoveredPosition(locationInfo)

                    clickProteinToGenome({
                      model: self as JBrowsePluginProteinStructureModel,
                      structureSeqPos: locationInfo.structureSeqPos,
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
                    const locationInfo = extractLocationInfo(loc)
                    self.setHoveredPosition(locationInfo)
                    hoverProteinToGenome({
                      model: self as JBrowsePluginProteinStructureModel,
                      structureSeqPos: locationInfo.structureSeqPos,
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
          if (structure && structureSeqHoverPos !== undefined) {
            highlightResidue({
              structure,
              plugin: molstarPluginContext,
              selectedResidue: structureSeqHoverPos,
            })
          }
        }),
      )

      addDisposer(
        self,
        autorun(() => {
          const { structureSeqHoverPos, structurePositionToAlignmentMap } = self
          self.setPairwiseAlignmentHoverPos(
            structureSeqHoverPos === undefined
              ? undefined
              : structurePositionToAlignmentMap?.[structureSeqHoverPos],
          )
        }),
      )
    },
  }))

export default Structure

export type JBrowsePluginProteinStructureStateModel = typeof Structure
export type JBrowsePluginProteinStructureModel =
  Instance<JBrowsePluginProteinStructureStateModel>
