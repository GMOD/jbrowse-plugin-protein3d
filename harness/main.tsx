import React from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import molstarCss from '../src/ProteinView/css/molstar'

const style = document.createElement('style')
style.textContent = molstarCss
document.head.append(style)

createRoot(document.getElementById('root')!).render(<App />)
