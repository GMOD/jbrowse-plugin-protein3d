// @vitest-environment jsdom
import { createElement } from 'react'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import stateModelFactory from '../model'
import RangeBar, { rangeText } from './RangeBar'

import type * as JBrowseCoreUtil from '@jbrowse/core/util'

vi.mock('@jbrowse/core/util', async importActual => {
  const actual = await importActual<typeof JBrowseCoreUtil>()
  return { ...actual, getSession: () => ({ hovered: undefined, views: [] }) }
})

const ProteinView = stateModelFactory()

afterEach(() => {
  cleanup()
})

function renderBar(onClick: () => void) {
  const view = ProteinView.create({
    type: 'ProteinView',
    structures: [{ url: 'a.cif' }],
  })
  const model = view.structures[0]!
  render(
    createElement(RangeBar, {
      alignmentStart: 3,
      alignmentEnd: 7,
      top: 0,
      height: '100%',
      color: 'red',
      selected: false,
      tooltip: 'Helix',
      ariaLabel: 'Helix 245-250',
      dataAttributes: { 'data-testid': 'bar' },
      onClick,
      model,
    }),
  )
  return { model, bar: screen.getByRole('button', { name: 'Helix 245-250' }) }
}

test('names one residue alone and several as a range', () => {
  expect(rangeText(248, 248)).toBe('248')
  expect(rangeText(245, 250)).toBe('245-250')
})

test('a bar is reached by keyboard and activated by Enter or Space', () => {
  const onClick = vi.fn()
  const { bar } = renderBar(onClick)
  expect(bar.tabIndex).toBe(0)
  fireEvent.keyDown(bar, { key: 'Enter' })
  fireEvent.keyDown(bar, { key: ' ' })
  fireEvent.keyDown(bar, { key: 'a' })
  fireEvent.click(bar)
  expect(onClick).toHaveBeenCalledTimes(3)
})

test('focusing a bar lights its columns as a hover does', () => {
  const { model, bar } = renderBar(() => {})
  fireEvent.focus(bar)
  expect(model.alignmentHoverRange).toEqual({ start: 3, end: 7 })
  fireEvent.blur(bar)
  expect(model.alignmentHoverRange).toBeUndefined()
})
