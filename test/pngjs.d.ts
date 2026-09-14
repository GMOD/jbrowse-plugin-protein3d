// pngjs ships no types and only `PNG.sync.read` is used here, to count inked
// pixels in a screenshot. A `declare module` alone would type it `any`, which
// is what this file exists to avoid.
declare module 'pngjs' {
  export const PNG: {
    sync: {
      read(buffer: Buffer): { data: Buffer; width: number; height: number }
    }
  }
}
