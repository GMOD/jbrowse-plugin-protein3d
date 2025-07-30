import PluginManager from '@jbrowse/core/PluginManager'
import { PluggableElementType } from '@jbrowse/core/pluggableElementTypes'
import DisplayType from '@jbrowse/core/pluggableElementTypes/DisplayType'
import { MenuItem } from '@jbrowse/core/ui'
import { Feature, getContainingTrack, getSession } from '@jbrowse/core/util'
import AddIcon from '@mui/icons-material/Add'

import LaunchProteinViewDialog from './components/LaunchProteinViewDialog'

import type { IAnyModelType } from 'mobx-state-tree'

function isDisplay(elt: { name: string }): elt is DisplayType {
  return elt.name === 'LinearBasicDisplay'
}

function extendStateModel(stateModel: IAnyModelType) {
  return stateModel.views(
    (self: {
      contextMenuItems: () => MenuItem[]
      contextMenuFeature?: Feature
    }) => {
      const superContextMenuItems = self.contextMenuItems
      return {
        contextMenuItems() {
          const feature = self.contextMenuFeature
          const track = getContainingTrack(self)
          const showProteinMenuItem =
            feature &&
            ['gene', 'mRNA', 'transcript'].includes(feature.get('type'))
          return [
            ...superContextMenuItems(),
            ...(showProteinMenuItem
              ? [
                  {
                    label: 'Launch protein view',
                    icon: AddIcon,
                    onClick: () => {
                      getSession(track).queueDialog(handleClose => [
                        LaunchProteinViewDialog,
                        {
                          model: track,
                          handleClose,
                          feature,
                        },
                      ])
                    },
                  },
                ]
              : []),
          ]
        },
      }
    },
  )
}

export default function LaunchProteinViewF(pluginManager: PluginManager) {
  pluginManager.addToExtensionPoint(
    'Core-extendPluggableElement',
    (elt: PluggableElementType) => {
      if (isDisplay(elt)) {
        elt.stateModel = extendStateModel(elt.stateModel)
      }
      return elt
    },
  )
}
