import Plugin from '@jbrowse/core/Plugin'
import PluginManager from '@jbrowse/core/PluginManager'
import { AbstractSessionModel, isAbstractMenuManager } from '@jbrowse/core/util'
import { addDisposer, types } from 'mobx-state-tree'
import { autorun } from 'mobx'
import { ungzip } from 'pako'

// locals
import { version } from '../package.json'
import ProteinViewF from './ProteinView'
import LaunchProteinViewF from './LaunchProteinView'
import AddHighlightModelF from './AddHighlightModel'
import { Row } from './LaunchProteinView/util'

const ProteinModel = types
  .model({})
  .volatile(() => ({
    data: undefined as Row[] | undefined,
    error: undefined as unknown,
  }))
  .actions(self => ({
    setData(a?: Row[]) {
      self.data = a
    },
    setError(e: unknown) {
      self.error = e
    },
  }))
  .actions(self => {
    // @ts-expect-error
    const superAfter = self.afterAttach
    return {
      afterAttach() {
        superAfter?.()
        const url = 'https://jbrowse.org/demos/protein3d/mart_export.txt.gz'
        addDisposer(
          self,
          autorun(async () => {
            try {
              const d = new TextDecoder('utf8')
                .decode(ungzip(await myfetch(url)))
                .split('\n')
                .slice(1)
                .filter(f => !!f)
                .map(f => {
                  const res = f.split('\t')
                  const [
                    gene_id,
                    gene_id_version,
                    transcript_id,
                    transcript_id_version,
                    pdb_id,
                    refseq_mrna_id,
                    refseq_mrna_predicted_id,
                  ] = res
                  return {
                    gene_id,
                    gene_id_version,
                    transcript_id_version,
                    transcript_id,
                    pdb_id,
                    refseq_mrna_predicted_id,
                    refseq_mrna_id,
                  }
                })
              console.log({ d })
              self.setData(d)
            } catch (error) {
              self.setError(error)
            }
          }),
        )
      },
    }
  })

async function myfetch(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}: ${await res.text()}`)
  }
  return res.arrayBuffer()
}
export default class ProteinViewer extends Plugin {
  name = 'ProteinViewer'
  version = version

  install(pluginManager: PluginManager) {
    ProteinViewF(pluginManager)
    LaunchProteinViewF(pluginManager)
    AddHighlightModelF(pluginManager)

    pluginManager.addToExtensionPoint('Core-extendSession', session => {
      return types.compose(
        types.model({ proteinModel: types.optional(ProteinModel, {}) }),
        // @ts-expect-error
        session,
      )
    })
  }

  configure(pluginManager: PluginManager) {
    if (isAbstractMenuManager(pluginManager.rootModel)) {
      pluginManager.rootModel.appendToMenu('Add', {
        label: 'Protein View',
        onClick: (session: AbstractSessionModel) => {
          session.addView('ProteinView', {})
        },
      })
    }
  }
}
