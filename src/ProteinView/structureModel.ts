import { SimpleFeature, getSession } from '@jbrowse/core/util'
import {
  type Instance,
  addDisposer,
  getParent,
  types,
} from '@jbrowse/mobx-state-tree'
import { autorun } from 'mobx'

import clearSelection from './clearSelection'
import highlightResidue from './highlightResidue'
import highlightResidueRange from './highlightResidueRange'
import loadMolstar from './loadMolstar'
import { runLocalAlignment } from './pairwiseAlignment'
import { proteinAbbreviationMapping } from './proteinAbbreviationMapping'
import {
  clickProteinToGenome,
  proteinRangeToGenomeMapping,
  proteinToGenomeMapping,
} from './proteinToGenomeMapping'
import selectResidue from './selectResidue'
import { checkHovered, invertMap } from './util'
import { getUniprotIdFromAlphaFoldTarget } from '../LaunchProteinView/utils/launchViewUtils'
import { stripStopCodon } from '../LaunchProteinView/utils/util'
import {
  genomeToTranscriptSeqMapping,
  structurePositionToAlignmentMap,
  structureSeqVsTranscriptSeqMap,
  transcriptPositionToAlignmentMap,
} from '../mappings'

import type { PairwiseAlignment } from '../mappings'
import type { AlignmentAlgorithm } from './types'
import type { SimpleFeatureSerialized } from '@jbrowse/core/util'
import type { Region as IRegion } from '@jbrowse/core/util/types'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'
import type { PluginContext } from 'molstar/lib/mol-plugin/context'

type LGV = LinearGenomeViewModel
type MaybeLGV = LGV | undefined
type MaybePairwiseAlignment = PairwiseAlignment | undefined

export interface ParentProteinView {
  zoomToBaseLevel: boolean
  autoScrollAlignment: boolean
  showHighlight: boolean
  showProteinTracks: boolean
  alignmentAlgorithm: AlignmentAlgorithm
  molstarPluginContext: PluginContext | undefined
  structures: { url?: string }[]
  setShowAlignment: (f: boolean) => void
  setError: (e: unknown) => void
}

function extractLocationInfo(
  molstar: Awaited<ReturnType<typeof loadMolstar>>,
  location: ReturnType<
    (typeof molstar.StructureElement.Loci)['getFirstLocation']
  > &
    object,
) {
  return {
    structureSeqPos:
      molstar.StructureProperties.residue.auth_seq_id(location) - 1,
    code: molstar.StructureProperties.atom.label_comp_id(location),
    chain: molstar.StructureProperties.chain.auth_asym_id(location),
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
     * Inclusive-exclusive structure-residue range from a click; drives the
     * derived clickGenomeHighlights getter.
     */
    clickedStructureRange: undefined as
      | { start: number; end: number }
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
    structureSequences: undefined as string[] | undefined,
    /**
     * #volatile
     */
    isMouseInAlignment: false,
    /**
     * #volatile
     * Tracks whether this structure has been loaded into Molstar
     */
    loadedToMolstar: false,
    /**
     * #volatile
     * Range of alignment positions to highlight (e.g., when hovering a protein feature)
     */
    alignmentHoverRange: undefined as
      | { start: number; end: number }
      | undefined,
    /**
     * #volatile
     * Persistent range of alignment positions from click (e.g., when clicking a protein feature)
     */
    clickAlignmentRange: undefined as
      | { start: number; end: number }
      | undefined,
    /**
     * #volatile
     * The uniqueId of the currently selected protein feature (for persistent highlight)
     */
    selectedFeatureId: undefined as string | undefined,
    /**
     * #volatile
     * Set of feature track types that are hidden
     */
    hiddenFeatureTypes: new Set<string>(),
  }))
  .actions(self => ({
    setSequences(str?: string[]) {
      self.structureSequences = str
    },
    /**
     * #action
     */
    hideFeatureType(type: string) {
      self.hiddenFeatureTypes = new Set([...self.hiddenFeatureTypes, type])
    },
    /**
     * #action
     */
    showFeatureType(type: string) {
      const newSet = new Set(self.hiddenFeatureTypes)
      newSet.delete(type)
      self.hiddenFeatureTypes = newSet
    },
    /**
     * #action
     */
    showAllFeatureTypes() {
      self.hiddenFeatureTypes = new Set()
    },
    /**
     * #action
     */
    setLoadedToMolstar(val: boolean) {
      self.loadedToMolstar = val
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
    setClickedStructureRange(range?: { start: number; end: number }) {
      self.clickedStructureRange = range
    },
    /**
     * #action
     */
    clearClickedStructureRange() {
      self.clickedStructureRange = undefined
    },
    /**
     * #action
     */
    setAlignmentHoverRange(range?: { start: number; end: number }) {
      self.alignmentHoverRange = range
    },
    /**
     * #action
     */
    clearAlignmentHoverRange() {
      self.alignmentHoverRange = undefined
    },
    /**
     * #action
     */
    setClickAlignmentRange(range?: { start: number; end: number }) {
      self.clickAlignmentRange = range
    },
    /**
     * #action
     */
    clearClickAlignmentRange() {
      self.clickAlignmentRange = undefined
    },
    /**
     * #action
     */
    setSelectedFeatureId(uniqueId?: string) {
      self.selectedFeatureId = uniqueId
    },
    /**
     * #action
     */
    clearSelectedFeatureId() {
      self.selectedFeatureId = undefined
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
    setAlignment(r?: PairwiseAlignment) {
      self.pairwiseAlignment = r
    },
    /**
     * #action
     */
    setIsMouseInAlignment(val: boolean) {
      self.isMouseInAlignment = val
    },
  }))
  .views(self => ({
    /**
     * #getter
     * Extracts UniProt ID from AlphaFold URL if available
     */
    get uniprotId() {
      const { url } = self
      if (!url) {
        return undefined
      }
      return getUniprotIdFromAlphaFoldTarget(url)
    },
    /**
     * #getter
     */
    get structureTranscriptMaps() {
      return self.pairwiseAlignment
        ? structureSeqVsTranscriptSeqMap(self.pairwiseAlignment)
        : undefined
    },
    /**
     * #getter
     */
    get structureSeqToTranscriptSeqPosition() {
      return this.structureTranscriptMaps?.structureSeqToTranscriptSeqPosition
    },
    /**
     * #getter
     */
    get transcriptSeqToStructureSeqPosition() {
      return this.structureTranscriptMaps?.transcriptSeqToStructureSeqPosition
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
    get hoverString() {
      const r = self.hoverPosition
      if (r === undefined) {
        return ''
      }
      const structureLetter = this.hoverStructureLetter
      const genomeLetter = this.hoverGenomeLetter
      const parts = []

      if (r.structureSeqPos !== undefined) {
        parts.push(`Position: ${r.structureSeqPos + 1}`)
      }

      if (structureLetter) {
        parts.push(`Structure: ${structureLetter}`)
      }

      if (genomeLetter && structureLetter && genomeLetter !== structureLetter) {
        parts.push(`Genome: ${genomeLetter}`)
      }

      if (r.chain) {
        parts.push(`Chain: ${r.chain}`)
      }

      return parts.join(', ')
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
    get alignmentHoverPos() {
      const pos = this.structureSeqHoverPos
      return pos === undefined
        ? undefined
        : this.structurePositionToAlignmentMap?.[pos]
    },

    /**
     * #getter
     * Genome regions to highlight in the LGV based on the current hover
     * position. Derived; no manual set/clear actions are needed.
     */
    get hoverGenomeHighlights(): IRegion[] {
      const structureSeqPos = this.structureSeqHoverPos
      const assemblyName = self.connectedView?.assemblyNames[0]
      const mapping = this.genomeToTranscriptSeqMapping
      if (structureSeqPos === undefined || !assemblyName || !mapping) {
        return []
      }
      const mapped = proteinToGenomeMapping({
        model: self as JBrowsePluginProteinStructureModel,
        structureSeqPos,
      })
      if (!mapped) {
        return []
      }
      const [start, end] = mapped
      return [{ assemblyName, refName: mapping.refName, start, end }]
    },

    /**
     * #getter
     * Genome regions to highlight in the LGV from the persistent click
     * selection. Derived from clickedStructureRange.
     */
    get clickGenomeHighlights(): IRegion[] {
      const range = self.clickedStructureRange
      const assemblyName = self.connectedView?.assemblyNames[0]
      const mapping = this.genomeToTranscriptSeqMapping
      if (!range || !assemblyName || !mapping) {
        return []
      }
      const mapped =
        range.end > range.start + 1
          ? proteinRangeToGenomeMapping({
              model: self as JBrowsePluginProteinStructureModel,
              structureSeqPos: range.start,
              structureSeqEndPos: range.end,
            })
          : proteinToGenomeMapping({
              model: self as JBrowsePluginProteinStructureModel,
              structureSeqPos: range.start,
            })
      if (!mapped) {
        return []
      }
      const [start, end] = mapped
      return [{ assemblyName, refName: mapping.refName, start, end }]
    },

    /**
     * #getter
     * Returns the single-letter amino acid code from the structure at hover position
     */
    get hoverStructureLetter() {
      const code = self.hoverPosition?.code
      if (code) {
        return proteinAbbreviationMapping[code]?.singleLetterCode
      }
      const structurePos = this.structureSeqHoverPos
      if (structurePos !== undefined && self.structureSequences?.[0]) {
        return self.structureSequences[0][structurePos]
      }
      return undefined
    },

    /**
     * #getter
     * Returns the single-letter amino acid code from the genome/transcript at hover position
     */
    get hoverGenomeLetter() {
      const structurePos = this.structureSeqHoverPos
      if (structurePos === undefined) {
        return undefined
      }
      const transcriptPos =
        this.structureSeqToTranscriptSeqPosition?.[structurePos]
      if (transcriptPos === undefined) {
        return undefined
      }
      return self.userProvidedTranscriptSequence[transcriptPos]
    },

    /**
     * #getter
     */
    get alignmentMatchSet() {
      const con = self.pairwiseAlignment?.consensus
      if (!con) {
        return undefined
      }
      const matchSet = new Set<number>()
      for (let i = 0; i < con.length; i++) {
        if (con[i] === '|' || con[i] === ':') {
          matchSet.add(i)
        }
      }
      return matchSet
    },

    /**
     * #getter
     */
    get exactMatch() {
      const r1 = stripStopCodon(self.userProvidedTranscriptSequence)
      const r2 = self.structureSequences?.[0]
        ? stripStopCodon(self.structureSequences[0])
        : undefined
      return r1 === r2
    },

    get parentView(): ParentProteinView {
      return getParent<ParentProteinView>(self, 2)
    },
    get zoomToBaseLevel(): boolean {
      return this.parentView.zoomToBaseLevel
    },
    get autoScrollAlignment(): boolean {
      return this.parentView.autoScrollAlignment
    },
    get showHighlight(): boolean {
      return this.parentView.showHighlight
    },
    get showProteinTracks(): boolean {
      return this.parentView.showProteinTracks
    },
    get alignmentAlgorithm(): AlignmentAlgorithm {
      return this.parentView.alignmentAlgorithm
    },
    get molstarPluginContext(): PluginContext | undefined {
      return this.parentView.molstarPluginContext
    },
    /**
     * #getter
     * Returns this structure's index in the parent's structures array
     */
    get structureIndex() {
      return this.parentView.structures.indexOf(self)
    },
    /**
     * #getter
     * Returns the Molstar structure object for the current structure.
     * Note: We access loadedToMolstar to ensure MobX recomputes this getter
     * when the structure finishes loading (Molstar's internal state isn't observable).
     */
    get molstarStructure() {
      const idx = this.structureIndex
      return self.loadedToMolstar && idx >= 0
        ? this.molstarPluginContext?.managers.structure.hierarchy.current
            .structures[idx]?.cell.obj?.data
        : undefined
    },
  }))
  .actions(self => ({
    /**
     * #action
     */
    hoverAlignmentPosition(alignmentPos: number) {
      if (!self.alignmentHoverRange) {
        const structureSeqPos =
          self.pairwiseAlignmentToStructurePosition?.[alignmentPos]
        self.setHoveredPosition(
          structureSeqPos !== undefined ? { structureSeqPos } : undefined,
        )
      }
    },
    /**
     * #action
     */
    clickAlignmentPosition(alignmentPos: number) {
      const structureSeqPos =
        self.pairwiseAlignmentToStructurePosition?.[alignmentPos]
      self.clearSelectedFeatureId()
      self.setClickAlignmentRange({ start: alignmentPos, end: alignmentPos })
      if (structureSeqPos !== undefined) {
        clickProteinToGenome({
          model: self as JBrowsePluginProteinStructureModel,
          structureSeqPos,
        }).catch((e: unknown) => {
          console.error(e)
        })
      }
    },
  }))
  .actions(self => ({
    afterAttach() {
      addDisposer(
        self,
        autorun(async () => {
          try {
            const {
              userProvidedTranscriptSequence,
              structureSequences,
              exactMatch,
              alignmentAlgorithm,
            } = self
            const seq1 = userProvidedTranscriptSequence
            const seq2 = structureSequences?.[0]

            if (self.pairwiseAlignment || !seq1 || !seq2) {
              return
            }
            const r1 = stripStopCodon(seq1)
            const r2 = stripStopCodon(seq2)
            if (exactMatch) {
              self.setAlignment({
                consensus: '|'.repeat(r1.length),
                alns: [
                  { id: 'seq1', seq: r1 },
                  { id: 'seq2', seq: r2 },
                ],
              })
            } else {
              const pairwiseAlignment = runLocalAlignment(
                r1,
                r2,
                alignmentAlgorithm,
              )
              self.setAlignment(pairwiseAlignment)
              self.parentView.setShowAlignment(true)
            }
          } catch (e) {
            console.error(e)
            self.parentView.setError(e)
          }
        }),
      )

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
            if (pos !== undefined) {
              const c0 = transcriptSeqToStructureSeqPosition?.[pos]
              if (c0 !== undefined) {
                self.setHoveredPosition({ structureSeqPos: c0 })
              }
            }
          }
        }),
      )

      addDisposer(
        self,
        autorun(async () => {
          const { molstarPluginContext } = self
          if (molstarPluginContext) {
            const molstar = await loadMolstar()
            const ret =
              molstarPluginContext.behaviors.interaction.click.subscribe(e => {
                if (molstar.StructureElement.Loci.is(e.current.loci)) {
                  const loc = molstar.StructureElement.Loci.getFirstLocation(
                    e.current.loci,
                  )
                  if (loc) {
                    const locationInfo = extractLocationInfo(molstar, loc)
                    self.setHoveredPosition(locationInfo)
                    self.clearClickAlignmentRange()
                    self.clearSelectedFeatureId()

                    clickProteinToGenome({
                      model: self as JBrowsePluginProteinStructureModel,
                      structureSeqPos: locationInfo.structureSeqPos,
                    }).catch((e: unknown) => {
                      console.error(e)
                      self.parentView.setError(e)
                    })
                  }
                }
              })
            addDisposer(self, () => {
              ret.unsubscribe()
            })
          }
        }),
      )

      addDisposer(
        self,
        autorun(async () => {
          const { molstarPluginContext } = self
          if (molstarPluginContext) {
            const molstar = await loadMolstar()
            const ret =
              molstarPluginContext.behaviors.interaction.hover.subscribe(e => {
                if (molstar.StructureElement.Loci.is(e.current.loci)) {
                  const loc = molstar.StructureElement.Loci.getFirstLocation(
                    e.current.loci,
                  )
                  if (loc) {
                    const locationInfo = extractLocationInfo(molstar, loc)
                    self.setHoveredPosition(locationInfo)
                  }
                } else {
                  self.setHoveredPosition(undefined)
                }
              })
            addDisposer(self, () => {
              ret.unsubscribe()
            })
          }
        }),
      )

      addDisposer(
        self,
        autorun(async () => {
          const {
            showHighlight,
            structureSeqToTranscriptSeqPosition,
            molstarPluginContext,
            molstarStructure,
          } = self
          if (
            molstarStructure &&
            molstarPluginContext &&
            structureSeqToTranscriptSeqPosition
          ) {
            if (showHighlight) {
              for (const coord of Object.keys(
                structureSeqToTranscriptSeqPosition,
              )) {
                await selectResidue({
                  structure: molstarStructure,
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

      // Drive molstar hover-highlight state from the model. A feature-range
      // hover (alignmentHoverRange) takes priority over a single-residue
      // hover (structureSeqHoverPos); otherwise clear.
      addDisposer(
        self,
        autorun(async () => {
          const {
            molstarStructure,
            molstarPluginContext,
            alignmentHoverRange,
            structureSeqHoverPos,
            pairwiseAlignmentToStructurePosition,
          } = self
          if (molstarStructure && molstarPluginContext) {
            const rangeStartStruct =
              alignmentHoverRange &&
              pairwiseAlignmentToStructurePosition?.[alignmentHoverRange.start]
            const rangeEndStruct =
              alignmentHoverRange &&
              pairwiseAlignmentToStructurePosition?.[alignmentHoverRange.end]
            if (
              rangeStartStruct !== undefined &&
              rangeEndStruct !== undefined
            ) {
              await highlightResidueRange({
                structure: molstarStructure,
                plugin: molstarPluginContext,
                startResidue: rangeStartStruct + 1,
                endResidue: rangeEndStruct + 1,
              })
            } else if (structureSeqHoverPos !== undefined) {
              await highlightResidue({
                structure: molstarStructure,
                plugin: molstarPluginContext,
                selectedResidue: structureSeqHoverPos,
              })
            } else {
              molstarPluginContext.managers.interactivity.lociHighlights.clearHighlights()
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
