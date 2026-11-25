import { isAlive } from '@jbrowse/mobx-state-tree'

import type { IAnyStateTreeNode } from '@jbrowse/mobx-state-tree'

export type FailureHost = IAnyStateTreeNode & {
  readonly molstarPluginContext: unknown
  addNotice: (notice: unknown) => void
}

/**
 * Logs a failure, and shows it on `host` only while `plugin` is still the one
 * `host` draws with: a disposed plugin's failure is not the reader's error.
 */
export function reportPluginFailure(host: FailureHost, plugin: unknown) {
  return (error: unknown) => {
    console.error(error)
    if (isAlive(host) && host.molstarPluginContext === plugin) {
      host.addNotice(error)
    }
  }
}

/** Shows each of `notices` on `host` on the same terms. */
export function reportPluginNotices(host: FailureHost, plugin: unknown) {
  return (notices: readonly string[]) => {
    if (isAlive(host) && host.molstarPluginContext === plugin) {
      for (const notice of notices) {
        host.addNotice(notice)
      }
    }
  }
}
