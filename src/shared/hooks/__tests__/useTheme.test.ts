import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../useTheme'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.documentElement.classList.remove('light', 'dark')
  })

  it('should default to light theme when no preference is stored', () => {
    localStorageMock.getItem.mockReturnValue(null)
    
    const { result } = renderHook(() => useTheme())
    
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('should use stored preference from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('dark')
    
    const { result } = renderHook(() => useTheme())
    
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should use OS preference when no stored preference exists', () => {
    localStorageMock.getItem.mockReturnValue(null)
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    
    const { result } = renderHook(() => useTheme())
    
    expect(result.current.theme).toBe('dark')
  })

  it('should toggle theme correctly', () => {
    localStorageMock.getItem.mockReturnValue('light')
    
    const { result } = renderHook(() => useTheme())
    
    act(() => {
      result.current.toggleTheme()
    })
    
    expect(result.current.theme).toBe('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('should set theme directly', () => {
    const { result } = renderHook(() => useTheme())
    
    act(() => {
      result.current.setTheme('dark')
    })
    
    expect(result.current.theme).toBe('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
  })
})