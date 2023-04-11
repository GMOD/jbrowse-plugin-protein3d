import React, { useCallback, useState, useEffect, useRef } from 'react'
import { Stage, StaticDatasource, DatasourceRegistry, Component } from 'ngl'
import { ProteinViewModel } from '../stateModel'

DatasourceRegistry.add(
  'data',
  new StaticDatasource('https://files.rcsb.org/download/'),
)

export default function ProteinPanel({ model }: { model: ProteinViewModel }) {
  const { mouseCol, structures, nglSelection, type = 'cartoon' } = model
  const annotations = useRef([])
  const [res, setRes] = useState<any[]>([])
  const [stage, setStage] = useState<Stage>()
  const [isMouseHovering, setMouseHovering] = useState(false)

  const stageElementRef = useCallback((element) => {
    if (element) {
      const currentStage = new Stage(element)
      setStage(currentStage)
    }
  }, [])

  useEffect(() => {
    return () => stage?.dispose()
  }, [stage])

  useEffect(() => {
    if (!structures.length || !stage) {
      return
    }

    function handleResize() {
      if (stage) {
        stage.handleResize()
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [structures, stage])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      // Handle window resizing

      if (!stage) {
        return
      }
      setRes(
        (
          await Promise.all(
            structures.map((s) =>
              stage.loadFile(`data://${s.structure.pdb}.pdb`),
            ),
          )
        ).filter((f): f is Component => !!f),
      )

      stage.signals.hovered.add(
        (pickingProxy: {
          atom: { resno: number; chainname: string }
          bond?: string
          closestBondAtom?: string
          picker: { structure: { name: string } }
        }) => {
          if (pickingProxy && (pickingProxy.atom || pickingProxy.bond)) {
            const atom = pickingProxy.atom || pickingProxy.closestBondAtom
            model.setMouseoveredColumn(
              atom.resno - structures[0]?.structure.startPos,
              atom.chainname,
              pickingProxy.picker.structure.name,
            )
          }
        },
      )
    })()
  })

  useEffect(() => {
    if (stage) {
      res.forEach((elt) => {
        elt.removeAllRepresentations()
        elt.addRepresentation(type, { sele: nglSelection })
      })
      stage.autoView()
    }
  }, [type, res, stage, nglSelection])

  const viewer = stage?.viewer
  useEffect(() => {
    if (!viewer) {
      return
    }
    if (!(structures.length && !isMouseHovering)) {
      return
    }
    res.forEach((elt, index) => {
      if (annotations.current.length) {
        elt.removeAnnotation(annotations.current[index])
      }
      annotations.current = []
      if (mouseCol !== undefined) {
        const offset = getOffset(
          structures[index].id,
          elt.structure,
          mouseCol,
          structures[0].structure.startPos,
          // @ts-expect-error
          () => {},
        )
        if (offset) {
          const ap = elt.structure.getAtomProxy()
          ap.index = offset.atomOffset

          annotations.current.push(
            // @ts-expect-error
            elt.addAnnotation(ap.positionToVector3(), offset.qualifiedName()),
          )
        }
      }
      viewer.requestRender()
    })
  }, [mouseCol, structures, viewer, res, isMouseHovering])

  return (
    <div
      ref={stageElementRef}
      style={{ width: 600, height: 400 }}
      onMouseEnter={() => setMouseHovering(true)}
      onMouseLeave={() => setMouseHovering(false)}
    />
  )
}

function getOffset(
  rowName: string,
  structure: any,
  mouseCol: number,
  startPos: number,
  relativePxToBp: (arg: string, col: number) => number,
) {
  const rn = structure.residueStore.count
  const rp = structure.getResidueProxy()
  const pos = relativePxToBp(rowName, mouseCol)
  for (let i = 0; i < rn; ++i) {
    rp.index = i
    if (rp.resno === pos + startPos - 1) {
      return rp
    }
  }
}
