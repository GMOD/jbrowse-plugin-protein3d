import { addDisposer, types } from 'mobx-state-tree'
import { autorun } from 'mobx'
import { ungzip } from 'pako'

// locals
import { Row } from './LaunchProteinView/util'
import { abfetch } from './fetchUtils'

const ProteinModelSessionExtension = types
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
    return {
      afterCreate() {
        const url = 'https://jbrowse.org/demos/protein3d/mart_export.txt.gz'
        addDisposer(
          self,
          autorun(async () => {
            try {
              const ret = new TextDecoder('utf8').decode(
                ungzip(await abfetch(url)),
              )
              const d = ret
                .split('\n')
                .slice(1)
                .filter(line => !!line)
                .map(line => {
                  const res = line.split('\t')
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

              self.setData(d)
            } catch (error) {
              self.setError(error)
            }
          }),
        )
      },
    }
  })

export default ProteinModelSessionExtension
