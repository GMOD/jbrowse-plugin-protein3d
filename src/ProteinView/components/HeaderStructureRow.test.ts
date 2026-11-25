// @vitest-environment jsdom
import { createElement } from 'react'

import { createTheme } from '@mui/material/styles'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import stateModelFactory from '../model'
import HeaderStructureRows from './HeaderStructureRow'

import type * as JBrowseCoreUtil from '@jbrowse/core/util'

vi.mock('@jbrowse/core/util', async importActual => {
  const actual = await importActual<typeof JBrowseCoreUtil>()
  return { ...actual, getSession: () => ({ hovered: undefined, views: [] }) }
})

const ProteinView = stateModelFactory()
const { palette } = createTheme()

function statusColor() {
  return getComputedStyle(screen.getByTestId('structure-status')).color
}

function rgb(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

afterEach(() => {
  cleanup()
})

test('a note on a structure is not drawn as an error', () => {
  const view = ProteinView.create({
    type: 'ProteinView',
    structures: [{ url: 'a.cif' }],
  })
  view.structures[0]!.setAlignmentSkipped('This structure has no chain')
  render(createElement(HeaderStructureRows, { model: view }))
  expect(statusColor()).not.toBe(rgb(palette.error.main))
})

test('a failed structure is drawn as an error', () => {
  const view = ProteinView.create({
    type: 'ProteinView',
    structures: [{ url: 'a.cif' }],
  })
  view.structures[0]!.setError(new Error('404'))
  render(createElement(HeaderStructureRows, { model: view }))
  expect(statusColor()).toBe(rgb(palette.error.main))
})
