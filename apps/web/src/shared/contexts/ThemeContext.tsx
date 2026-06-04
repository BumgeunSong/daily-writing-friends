import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react'

import { LEGACY_THEME_KEYS, STORAGE_KEYS, storage } from '@/shared/lib/storage'

type Theme = 'light' | 'dark'
type ThemePreference = 'system' | 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredPreference(): ThemePreference {
  LEGACY_THEME_KEYS.forEach(key => {
    if (storage.get(key)) storage.remove(key)
  })

  const stored = storage.get(STORAGE_KEYS.THEME_PREFERENCE)
  if (stored === 'system' || stored === 'light' || stored === 'dark') {
    return stored
  }
  return 'system'
}

function storePreference(preference: ThemePreference): void {
  storage.set(STORAGE_KEYS.THEME_PREFERENCE, preference)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize both states at once to avoid hook order changes
  const [preference, setPreference] = useState<ThemePreference>(getStoredPreference)
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme)

  // Compute actual theme based on preference
  const theme: Theme = preference === 'system' ? systemTheme : preference

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Apply theme to document and store preference
  useEffect(() => {
    const root = window.document.documentElement
    
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    
    // Store preference whenever it changes
    storePreference(preference)
  }, [theme, preference])

  const toggleTheme = () => {
    setPreference(prev => {
      // If currently following system, switch to opposite of current system theme
      if (prev === 'system') {
        return systemTheme === 'dark' ? 'light' : 'dark'
      }
      // If set to specific theme, toggle to the other specific theme
      return prev === 'light' ? 'dark' : 'light'
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}