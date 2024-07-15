import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react'
import { ErrorMessage, LoadingEllipses } from '@jbrowse/core/ui'
import { PluginContext } from 'molstar/lib/mol-plugin/context'
import domLoadScript from 'load-script'

// locals
import { JBrowsePluginProteinViewModel } from '../model'
import Header from './Header'

// hooks
import useProteinView from '../useProteinView'
import useProteinViewClickBehavior from '../useProteinViewClickBehavior'
import useProteinViewHoverBehavior from '../useProteinViewHoverBehavior'

// utils
import selectResidue from '../selectResidue'
import highlightResidue from '../highlightResidue'
import clearSelection from '../clearSelection'
import ProteinViewer from '../..'

function injectStylesheet(param: string) {
  if (document?.head) {
    const link = document.createElement('link')
    link.type = 'text/css'
    link.rel = 'stylesheet'

    //link.href = 'http://fonts.googleapis.com/css?family=Oswald&effect=neon';
    document.head.appendChild(link)

    link.href = param
  }
}

injectStylesheet(
  'https://www.ncbi.nlm.nih.gov/Structure/icn3d/lib/jquery-ui.min.css',
)

injectStylesheet('https://www.ncbi.nlm.nih.gov/Structure/icn3d/icn3d.css')

function promisifiedLoadScript(src: string) {
  return new Promise((resolve, reject) => {
    domLoadScript(src, (err, script) => {
      if (err) {
        reject(err)
      } else {
        resolve(script.src)
      }
    })
  })
}

function Icn3dProteinPanel({ model }: { model: ProteinViewer }) {
  const { url } = model
  const [error, setError] = useState<unknown>()
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        const icn3dui = new icn3d.iCn3DUI({
          divid: 'viewer',
          mobilemenu: true,
          url: 'mmcif|' + url,
        })
        await icn3dui.show3DStructure()
      } catch (e) {
        console.error(e)
        setError(e)
      }
    })()
  }, [url])
  return error ? <ErrorMessage error={error} /> : <div id="viewer" />
}

const Icn3dProteinView = observer(function ({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const [error, setError] = useState<unknown>()
  const [completed, setCompleted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        await promisifiedLoadScript(
          'https://www.ncbi.nlm.nih.gov/Structure/icn3d/lib/jquery.min.js',
        )
        await promisifiedLoadScript(
          'https://www.ncbi.nlm.nih.gov/Structure/icn3d/lib/jquery-ui.min.js',
        )
        await promisifiedLoadScript(
          'https://www.ncbi.nlm.nih.gov/Structure/icn3d/lib/threeClass.min.js',
        )
        await promisifiedLoadScript(
          'https://www.ncbi.nlm.nih.gov/Structure/icn3d/icn3d.min.js',
        )
        setCompleted(true)
      } catch (e) {
        console.error(e)
        setError(e)
      }
    })()
  }, [])

  return error ? (
    <ErrorMessage error={error} />
  ) : completed ? (
    <Icn3dProteinPanel model={model} />
  ) : (
    <LoadingEllipses />
  )
})

export default Icn3dProteinView
