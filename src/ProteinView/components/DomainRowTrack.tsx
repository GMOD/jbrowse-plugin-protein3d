import React from 'react'

import { observer } from 'mobx-react'

import RangeBar, { rangeText } from './RangeBar'

import type { DomainRow } from '../alignmentDomains'
import type { JBrowsePluginProteinStructureModel } from '../model'

const KIND_LABEL = { domain: 'Domain', site: 'Site' }

/** One overview row from the alignment: a bar per run of its residues */
const DomainRowTrack = observer(function DomainRowTrack({
  row,
  model,
}: {
  row: DomainRow
  model: JBrowsePluginProteinStructureModel
}) {
  const selected = model.selectedFeatureId === `alignment:${row.accession}`
  return row.bars.map(bar => {
    const residues = rangeText(
      model.residueNumber(bar.structureStart),
      model.residueNumber(bar.structureEnd - 1),
    )
    return (
      <RangeBar
        key={bar.alignmentStart}
        alignmentStart={bar.alignmentStart}
        alignmentEnd={bar.alignmentEnd}
        top={0}
        height={`calc(100% - ${model.trackGap}px)`}
        color={row.color}
        selected={selected}
        tooltip={
          <div>
            <div>
              <strong>{row.label}</strong>
            </div>
            <div>
              {KIND_LABEL[row.kind]} from the alignment, {row.accession}
            </div>
            <div>Structure residue: {residues}</div>
          </div>
        }
        ariaLabel={`${row.label} ${residues}`}
        dataAttributes={{
          'data-testid': `alignment-domain-${row.kind}`,
          'data-accession': row.accession,
        }}
        onClick={() => {
          model.toggleDomainRow(row)
        }}
        model={model}
      />
    )
  })
})

export default DomainRowTrack
