# Dark Mode Feature

This application includes a production-ready dark mode implementation using Tailwind CSS and React.

## How to Use

1. **Theme Toggle**: Navigate to the Settings page (설정) to find the theme toggle switch in the header
2. **Theme Persistence**: Your theme preference is automatically saved and will persist across browser sessions
3. **OS Preference**: On first visit, the app respects your operating system's theme preference

## Implementation Details

### Theme Strategy
- Uses Tailwind CSS's `darkMode: 'class'` strategy
- CSS custom properties for semantic color variables
- Automatic `dark` class toggling on the `<html>` element

### Key Components
- **useTheme Hook**: `src/shared/hooks/useTheme.ts` - Manages theme state and persistence
- **CSS Variables**: `src/index.css` - Defines light/dark color schemes using HSL values
- **Settings Toggle**: `src/user/components/UserSettingPage.tsx` - Theme toggle UI

### Theme Persistence Logic
1. **First Load**: Checks `localStorage.theme` for saved preference
2. **No Saved Preference**: Falls back to OS preference via `window.matchMedia('(prefers-color-scheme: dark)')`
3. **Subsequent Loads**: Always uses the saved preference from localStorage

### Testing the Feature

#### Manual Testing
1. Navigate to Settings page (/settings)
2. Toggle the theme switch in the header
3. Verify theme persists after page reload
4. Clear localStorage and verify OS preference is detected on first load

#### Automated Testing
```bash
npm test -- useTheme
```

### Color System
The app uses semantic color tokens that automatically adapt to both themes:
- `background` / `foreground` - Main background and text
- `card` / `card-foreground` - Card backgrounds and text
- `primary` / `primary-foreground` - Primary colors
- `secondary` / `secondary-foreground` - Secondary colors
- `muted` / `muted-foreground` - Muted/subdued colors
- `destructive` / `destructive-foreground` - Error/warning colors

### Browser Support
Works in all modern browsers that support CSS custom properties and the `matchMedia` API.