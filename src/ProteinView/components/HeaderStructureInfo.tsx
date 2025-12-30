import React from 'react'

import { observer } from 'mobx-react'

import { JBrowsePluginProteinViewModel } from '../model'

const HeaderStructureInfo = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  return model.structures.map((s, id) => {
    const { clickString, hoverString } = s

    return (
      <span key={id}>
        {[
          clickString ? `Click: ${clickString}` : '',
          hoverString ? `Hover: ${hoverString}` : '',
        ].join(' ')}
      </span>
    )
  })
})

export default HeaderStructureInfo
