import { useEffect } from 'react'

import { getSession } from '@jbrowse/core/util'
import { autorun, untracked } from 'mobx'
import { observer } from 'mobx-react'

import { getProteinView } from './util'

import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// CROSS-REPO DEPENDENCY: react-msaview (https://github.com/GMOD/react-msaview)
//
// This file reaches into the live MsaView model exposed by the `react-msaview`
// library (via the jbrowse-plugin-msaview wrapper) to drive a bidirectional
// hover highlight between a 3D structure and its alignment. The member names
// below are part of react-msaview's public model API — see
// react-msaview/packages/lib/src/model.ts (`mouseCol`, `setMousePos`). If those
// names change there, this sync silently stops working, so the two repos must
// be kept in step.
//
// NOTE on coordinates: `mouseCol` is an MSA *column* (gaps included), whereas
// `structureSeqHoverPos` is an ungapped residue index in the structure's
// sequence. We currently map them 1:1, which is only correct when the
// structure's MSA row has no leading gaps/insertions. A fully robust mapping
// needs the structure's row name plus react-msaview's
// `visibleColToSeqPos(rowName, col)` / `seqPosToVisibleCol(rowName, seqPos)` to
// translate across gaps. TODO: thread the structure's row identity through and
// use those helpers.
interface MsaView {
  id: string
  type: string
  mouseCol?: number
  setMousePos?: (col?: number, row?: number) => void
}

const ProteinToMsaHoverSync = observer(function ProteinToMsaHoverSync({
  model,
}: {
  model: LinearGenomeViewModel
}) {
  const session = getSession(model)
  const { views } = session

  const proteinView = getProteinView(session)

  const connectedMsaViewId = proteinView?.connectedMsaViewId
  const msaView = connectedMsaViewId
    ? (views.find(f => f.id === connectedMsaViewId) as MsaView | undefined)
    : undefined

  useEffect(() => {
    if (!proteinView || !msaView) {
      return
    }

    const disposers: (() => void)[] = []

    if (msaView.setMousePos) {
      const { setMousePos } = msaView
      disposers.push(
        autorun(() => {
          const structure = proteinView.structures[0]
          if (structure) {
            setMousePos(structure.structureSeqHoverPos)
          }
        }),
      )
    }

    disposers.push(
      autorun(() => {
        const col = msaView.mouseCol
        const structure = proteinView.structures[0]
        if (structure) {
          const hasFeatureHoverRange = untracked(
            () => !!structure.alignmentHoverRange,
          )
          if (!hasFeatureHoverRange) {
            structure.setHoveredPosition(
              col === undefined ? undefined : { structureSeqPos: col },
            )
          }
        }
      }),
    )

    return () => {
      disposers.forEach(d => {
        d()
      })
    }
  }, [proteinView, msaView])

  return null
})

export default ProteinToMsaHoverSync
