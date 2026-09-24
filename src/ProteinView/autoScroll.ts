/**
 * Pixel geometry for the alignment panel's scrolling, in the coordinates of its
 * horizontally scrolling container.
 */

/**
 * Where to scroll so a hovered column is centred, or undefined while all of it
 * is already visible. A sweep along the genome therefore turns a page each time
 * it reaches an edge, with half a viewport of what comes next in view.
 */
export function followHoverTarget({
  x,
  width,
  scrollLeft,
  clientWidth,
}: {
  x: number
  width: number
  scrollLeft: number
  clientWidth: number
}): number | undefined {
  const visible = x >= scrollLeft && x + width <= scrollLeft + clientWidth
  return visible ? undefined : x + width / 2 - clientWidth / 2
}

/**
 * Target scrollLeft to bring a selected [start, end) pixel range into view,
 * centering it, but only when it currently lies entirely off-screen. Returns
 * undefined when any part of the range is already visible, so a selection the
 * user can already see is left where it is.
 */
export function offScreenCenterTarget({
  start,
  end,
  scrollLeft,
  clientWidth,
}: {
  start: number
  end: number
  scrollLeft: number
  clientWidth: number
}): number | undefined {
  const viewEnd = scrollLeft + clientWidth
  const visible = end >= scrollLeft && start <= viewEnd
  return visible ? undefined : (start + end) / 2 - clientWidth / 2
}
