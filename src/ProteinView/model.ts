import { BaseViewModel } from '@jbrowse/core/pluggableElementTypes'
import { ElementId } from '@jbrowse/core/util/types/mst'
import Visibility from '@mui/icons-material/Visibility'
import { autorun } from 'mobx'
import { addDisposer, types } from 'mobx-state-tree'

import { addStructureFromData } from './addStructureFromData'
import { addStructureFromURL } from './addStructureFromURL'
import { extractStructureSequences } from './extractStructureSequences'
import highlightResidue from './highlightResidue'
import Structure from './structureModel'
import { AlignmentAlgorithm, DEFAULT_ALIGNMENT_ALGORITHM } from './types'

import type { Instance } from 'mobx-state-tree'
import type { PluginContext } from 'molstar/lib/mol-plugin/context'
export interface ProteinViewInitState {
  structures?: {
    url?: string
    data?: string
  }[]
  showControls?: boolean
  showAlignment?: boolean
}

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
        showControls: false,
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
        showAlignment: true,
        /**
         * #property
         */
        alignmentAlgorithm: types.optional(
          types.string,
          DEFAULT_ALIGNMENT_ALGORITHM,
        ),

        /**
         * #property
         * used for loading the protein view via session snapshots, e.g.
         * {
         *   "type": "ProteinView",
         *   "init": {
         *     "structures": [
         *       { "url": "https://files.rcsb.org/download/1A2B.pdb" }
         *     ],
         *     "showControls": true
         *   }
         * }
         */
        init: types.frozen<ProteinViewInitState | undefined>(),
      }),
    )
    .volatile(() => ({
      /**
       * #volatile
       */
      progress: '',
      /**
       * #volatile
       */
      error: undefined as unknown,
      /**
       * #volatile
       */
      molstarPluginContext: undefined as PluginContext | undefined,
      /**
       * #volatile
       */
      showManualAlignmentDialog: false,
    }))

    .actions(self => ({
      /**
       * #action
       */
      setHeight(n: number) {
        self.height = n
        return n
      },
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
      /**
       * #action
       */
      setAlignmentAlgorithm(algorithm: AlignmentAlgorithm) {
        self.alignmentAlgorithm = algorithm
      },
      /**
       * #action
       */
      setMolstarPluginContext(p?: PluginContext) {
        self.molstarPluginContext = p
      },
      /**
       * #action
       */
      setShowManualAlignmentDialog(val: boolean) {
        self.showManualAlignmentDialog = val
      },
      /**
       * #action
       */
      setInit(arg?: ProteinViewInitState) {
        self.init = arg
      },
      /**
       * #action
       */
      addStructure(structure: { url?: string; data?: string }) {
        self.structures.push(
          Structure.create({
            url: structure.url,
            data: structure.data,
            userProvidedTranscriptSequence: '',
          }),
        )
      },
    }))
    .actions(self => ({
      afterAttach() {
        // process init parameter for loading structures from session snapshots
        addDisposer(
          self,
          autorun(() => {
            const { init } = self
            if (init) {
              const { structures, showControls, showAlignment } = init

              if (structures) {
                for (const structure of structures) {
                  self.addStructure(structure)
                }
              }

              if (showControls !== undefined) {
                self.setShowControls(showControls)
              }

              if (showAlignment !== undefined) {
                self.setShowAlignment(showAlignment)
              }

              self.setInit(undefined)
            }
          }),
        )

        addDisposer(
          self,
          autorun(async () => {
            const { structures, molstarPluginContext } = self
            if (molstarPluginContext) {
              for (const structure of structures) {
                try {
                  const { model } = structure.data
                    ? await addStructureFromData({
                        data: structure.data,
                        plugin: molstarPluginContext,
                      })
                    : structure.url
                      ? await addStructureFromURL({
                          url: structure.url,
                          plugin: molstarPluginContext,
                        })
                      : { model: undefined }

                  const sequences = model
                    ? extractStructureSequences(model)
                    : undefined
                  structure.setSequences(sequences)
                } catch (e) {
                  self.setError(e)
                  console.error(e)
                }
              }
            }
          }),
        )

        addDisposer(
          self,
          autorun(() => {
            const { structures, molstarPluginContext } = self
            if (molstarPluginContext) {
              for (const [i, s0] of structures.entries()) {
                const structure =
                  molstarPluginContext.managers.structure.hierarchy.current
                    .structures[i]?.cell.obj?.data
                const pos = s0.structureSeqHoverPos
                if (structure && pos !== undefined) {
                  highlightResidue({
                    structure,
                    plugin: molstarPluginContext,
                    selectedResidue: pos,
                  })
                }
              }
            }
          }),
        )
      },
    }))
    .views(self => ({
      menuItems() {
        return [
          {
            label: 'Show pairwise alignment area',
            type: 'checkbox',
            checked: self.showAlignment,
            icon: Visibility,
            onClick: () => {
              self.setShowAlignment(!self.showAlignment)
            },
          },
          {
            label: 'Show pairwise alignment as green highlight',
            type: 'checkbox',
            checked: self.showHighlight,
            icon: Visibility,
            onClick: () => {
              self.setShowHighlight(!self.showHighlight)
            },
          },
          {
            label: 'Zoom to base level on click',
            type: 'checkbox',
            checked: self.zoomToBaseLevel,
            icon: Visibility,
            onClick: () => {
              self.setZoomToBaseLevel(!self.zoomToBaseLevel)
            },
          },
          {
            label: 'Import manual alignment...',
            onClick: () => {
              self.setShowManualAlignmentDialog(true)
            },
          },
        ]
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
