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
  const { structures, showAlignment, followCursor } = model
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <HeaderStructureInfo model={model} />
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
