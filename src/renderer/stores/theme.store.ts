// ────────────────────────────────────────────────────────
// Costerra ERP — Theme Store
// Manages light/dark theme preference with localStorage
// persistence and DOM class synchronization.
// ────────────────────────────────────────────────────────

import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeState {
    theme: Theme
    toggleTheme: () => void
}

const STORAGE_KEY = 'costerra-theme'

/**
 * Reads the persisted theme from localStorage.
 * Falls back to 'dark' if no preference is saved.
 */
function getPersistedTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'light' || stored === 'dark') return stored
    } catch {
        // localStorage unavailable — silent fallback
    }
    return 'dark'
}

/**
 * Applies the given theme by toggling the `dark` class
 * on the document root element. Tailwind's `darkMode: 'class'`
 * strategy uses this class to resolve the active palette.
 */
function applyTheme(theme: Theme): void {
    const root = document.documentElement
    if (theme === 'dark') {
        root.classList.add('dark')
    } else {
        root.classList.remove('dark')
    }
}

// Apply the persisted theme immediately on module load,
// before the first React render, to prevent a flash of
// the wrong palette.
const initialTheme = getPersistedTheme()
applyTheme(initialTheme)

export const useThemeStore = create<ThemeState>((set, get) => ({
    theme: initialTheme,

    toggleTheme: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        try {
            localStorage.setItem(STORAGE_KEY, next)
        } catch {
            // localStorage unavailable — preference won't persist
        }
        set({ theme: next })
    }
}))
