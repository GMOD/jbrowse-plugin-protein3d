import {
  BaseFeatureDataAdapter,
  BaseOptions,
} from '@jbrowse/core/data_adapters/BaseAdapter'
import { openLocation } from '@jbrowse/core/util/io'
import { ObservableCreate } from '@jbrowse/core/util/rxjs'
import {
  Region,
  Feature,
  doesIntersect2,
  SimpleFeature,
} from '@jbrowse/core/util'

export default class AlphaFoldConfidenceAdapter extends BaseFeatureDataAdapter {
  public static capabilities = ['getFeatures', 'getRefNames']

  public feats:
    | Promise<{ uniqueId: string; start: number; end: number; score: number }[]>
    | undefined

  private async loadDataP() {
    const scores = JSON.parse(
      await openLocation(this.getConf('location')).readFile('utf8'),
    ) as { residueNumber: number[]; confidenceScore: number[] }

    return scores.residueNumber.map((value, idx) => ({
      uniqueId: `feat-${idx}`,
      start: value,
      end: value + 1,
      score: scores.confidenceScore[idx]!,
    }))
  }

  private async loadData(_opts: BaseOptions = {}) {
    if (!this.feats) {
      this.feats = this.loadDataP().catch((e: unknown) => {
        this.feats = undefined
        throw e
      })
    }

    return this.feats
  }

  public async getRefNames(_opts: BaseOptions = {}) {
    return []
  }

  public getFeatures(query: Region, opts: BaseOptions = {}) {
    return ObservableCreate<Feature>(async observer => {
      const { start, end, refName } = query
      const data = await this.loadData()
      for (const f of data) {
        if (doesIntersect2(f.start, f.end, start, end)) {
          observer.next(new SimpleFeature({ ...f, refName }))
        }
      }
      observer.complete()
    }, opts.signal)
  }

  public freeResources(): void {}
}
