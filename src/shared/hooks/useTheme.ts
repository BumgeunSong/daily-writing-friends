import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
type ThemePreference = 'system' | 'light' | 'dark'

const THEME_STORAGE_KEY = 'theme-preference-v2'

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredPreference(): ThemePreference {
  try {
    // Clean up old theme keys to prevent conflicts
    const oldKeys = ['theme-preference', 'theme', 'color-scheme']
    oldKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key)
      }
    })
    
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'system' || stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch {
    // Handle storage errors silently
  }
  return 'system' // Default to system
}

function storePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Handle storage errors silently
  }
}

export function useTheme() {
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

  return {
    theme,
    toggleTheme,
    setTheme: setPreference
  }
}