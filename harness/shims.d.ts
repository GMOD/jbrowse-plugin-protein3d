// The repo ships @types/react but not @types/react-dom (JBrowse provides the
// runtime). The harness only needs createRoot, so declare the minimal surface
// rather than adding a devDependency + lockfile churn.
declare module 'react-dom/client' {
  import type { ReactNode } from 'react'
  export function createRoot(container: Element | DocumentFragment): {
    render(children: ReactNode): void
    unmount(): void
  }
}
