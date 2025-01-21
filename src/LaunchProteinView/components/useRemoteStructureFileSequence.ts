import { useEffect, useState } from 'react'

import { createPluginUI } from 'molstar/lib/mol-plugin-ui'
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18'

import { addStructureFromURL } from '../../ProteinView/addStructureFromURL'

async function structureFileSequenceFetcher(url: string) {
  const ret = document.createElement('div')
  const p = await createPluginUI({
    target: ret,
    render: renderReact18,
  })
  try {
    const { model } = await addStructureFromURL({ url, plugin: p })
    return model.obj?.data.sequence.sequences.map(s => {
      let seq = ''
      const arr = s.sequence.label.toArray()
      // eslint-disable-next-line unicorn/no-for-loop,@typescript-eslint/prefer-for-of
      for (let i = 0; i < arr.length; i++) {
        seq += arr[i]!
      }
      return seq
    })
  } finally {
    p.unmount()
    ret.remove()
  }
}

export default function useRemoteStructureFileSequence({
  url,
}: {
  url?: string
}) {
  const [error, setError] = useState<unknown>()
  const [isLoading, setLoading] = useState(false)
  const [sequences, setSequences] = useState<string[]>()
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        if (url) {
          setLoading(true)
          const seq = await structureFileSequenceFetcher(url)
          if (seq) {
            setSequences(seq)
          } else {
            throw new Error('no sequences detected in file')
          }
        }
      } catch (e) {
        console.error(e)
        setError(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [url])
  return { error, isLoading, sequences }
}
