import React from 'react'

import { LoadingEllipses } from '@jbrowse/core/ui'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import { observer } from 'mobx-react'

import AddStructureDialog from './AddStructureDialog'
import HeaderStructureInfo from './HeaderStructureInfo'
import ProteinAlignment from './ProteinAlignment'

import type {
  JBrowsePluginProteinStructureModel,
  JBrowsePluginProteinViewModel,
} from '../model'

const ProteinViewHeader = observer(function ProteinViewHeader({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { structures, showAlignment, followCursor, autoScrollAlignment } = model
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <HeaderStructureInfo model={model} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={autoScrollAlignment}
                onChange={() => model.setAutoScrollAlignment(!autoScrollAlignment)}
                size="small"
              />
            }
            label="Auto-scroll"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={followCursor}
                onChange={() => model.setFollowCursor(!followCursor)}
                size="small"
              />
            }
            label="Follow cursor"
          />
        </div>
      </div>
      {showAlignment
        ? structures.map(
            (structure: JBrowsePluginProteinStructureModel, idx: number) => {
              const { pairwiseAlignment } = structure
              return (
                <div key={idx}>
                  {pairwiseAlignment ? (
                    <ProteinAlignment key={idx} model={structure} />
                  ) : (
                    <LoadingEllipses message="Loading pairwise alignment" />
                  )}
                </div>
              )
            },
          )
        : null}
      <AddStructureDialog model={model} />
    </div>
  )
})

export default ProteinViewHeader
