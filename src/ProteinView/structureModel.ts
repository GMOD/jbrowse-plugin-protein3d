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

import { runLocalAlignment } from './pairwiseAlignment'
import {
  PairwiseAlignment,
  genomeToTranscriptSeqMapping,
  structurePositionToAlignmentMap,
  structureSeqVsTranscriptSeqMap,
  transcriptPositionToAlignmentMap,
} from '../mappings'
import clearSelection from './clearSelection'
import highlightResidue from './highlightResidue'
import { proteinAbbreviationMapping } from './proteinAbbreviationMapping'
import {
  clickProteinToGenome,
  hoverProteinToGenome,
} from './proteinToGenomeMapping'
import selectResidue from './selectResidue'
import { AlignmentAlgorithm } from './types'
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
    isMouseInAlignment: false,
    /**
     * #volatile
     * Tracks whether this structure has been loaded into Molstar
     */
    loadedToMolstar: false,
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
    setAlignment(r?: PairwiseAlignment) {
      self.pairwiseAlignment = r
    },
    /**
     * #action
     */
    setAlignmentStatus(str: string) {
      self.pairwiseAlignmentStatus = str
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
      // AlphaFold URLs: https://alphafold.ebi.ac.uk/files/AF-P12345-F1-model_v4.cif
      const match = /AF-([A-Z0-9]+)-F\d+/.exec(url)
      if (match) {
        return match[1]
      }
      return undefined
    },
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
      if (r === undefined) {
        return ''
      }
      const structureLetter = this.hoverStructureLetter
      const genomeLetter = this.hoverGenomeLetter
      const parts = []

      // Position (1-based)
      if (r.structureSeqPos !== undefined) {
        parts.push(`Position: ${r.structureSeqPos + 1}`)
      }

      // Structure letter
      if (structureLetter) {
        parts.push(`Structure: ${structureLetter}`)
      }

      // Genome letter (only if different from structure)
      if (genomeLetter && structureLetter && genomeLetter !== structureLetter) {
        parts.push(`Genome: ${genomeLetter}`)
      }

      // Chain (if available from Molstar)
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
     * Returns the single-letter amino acid code from the structure at hover position
     */
    get hoverStructureLetter() {
      // Use 3-letter code from Molstar if available (when hovering 3D structure)
      const code = self.hoverPosition?.code
      if (code) {
        return proteinAbbreviationMapping[code]?.singleLetterCode
      }
      // Fall back to structure sequence (when hovering alignment)
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
    get alignmentAlgorithm(): AlignmentAlgorithm {
      // @ts-expect-error
      return getParent(self, 2).alignmentAlgorithm
    },
    get molstarPluginContext(): PluginContext | undefined {
      // @ts-expect-error
      return getParent(self, 2).molstarPluginContext
    },
    /**
     * #getter
     * Returns the Molstar structure object for the current structure
     */
    get molstarStructure() {
      return this.molstarPluginContext?.managers.structure.hierarchy.current
        .structures[0]?.cell.obj?.data
    },
  }))
  .actions(self => ({
    /**
     * #action
     * Highlight a residue from an external source (e.g., MSA view)
     * This triggers the visual highlight in Molstar without updating internal state
     */
    highlightFromExternal(structureSeqPos: number) {
      const structure = self.molstarStructure
      const plugin = self.molstarPluginContext
      if (structure && plugin) {
        highlightResidue({
          structure,
          selectedResidue: structureSeqPos,
          plugin,
        })
      }
    },

    /**
     * #action
     * Clear highlight from an external source
     */
    clearHighlightFromExternal() {
      const plugin = self.molstarPluginContext
      plugin?.managers.interactivity.lociHighlights.clearHighlights()
    },

    /**
     * #action
     */
    hoverAlignmentPosition(alignmentPos: number) {
      const structureSeqPos =
        self.pairwiseAlignmentToStructurePosition?.[alignmentPos]
      self.setHoveredPosition({
        structureSeqPos,
      })
      if (structureSeqPos !== undefined) {
        hoverProteinToGenome({
          model: self as JBrowsePluginProteinStructureModel,
          structureSeqPos,
        })
      }
    },
    /**
     * #action
     */
    clickAlignmentPosition(alignmentPos: number) {
      const structureSeqPos =
        self.pairwiseAlignmentToStructurePosition?.[alignmentPos]
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
      // pairwise align transcript sequence to structure residues
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
              self.setAlignmentStatus('Running alignment...')
              const pairwiseAlignment = runLocalAlignment(
                r1,
                r2,
                alignmentAlgorithm,
              )
              self.setAlignment(pairwiseAlignment)
              self.setAlignmentStatus('')

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
    },
  }))

export default Structure

export type JBrowsePluginProteinStructureStateModel = typeof Structure
export type JBrowsePluginProteinStructureModel =
  Instance<JBrowsePluginProteinStructureStateModel>
