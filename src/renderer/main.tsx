// ────────────────────────────────────────────────────────
// Costerra ERP — React Entry Point
// ────────────────────────────────────────────────────────

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/globals.css'
// Eagerly import the theme store so its module-level initializer
// applies the persisted theme class before the first React render.
import './stores/theme.store'

const root = document.getElementById('root')

if (!root) {
    throw new Error('Root element not found. Ensure index.html has a <div id="root">.')
}

ReactDOM.createRoot(root).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
)
