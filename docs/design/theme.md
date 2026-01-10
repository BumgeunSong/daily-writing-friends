# Theme System

Dark mode implementation, accessibility guidelines, and mobile optimizations.

## Dark Mode

### Strategy
- Uses Tailwind CSS's `darkMode: 'class'` strategy
- CSS custom properties for semantic color variables
- Automatic `dark` class toggling on the `<html>` element

### Key Components
| Component | Location | Purpose |
|-----------|----------|---------|
| ThemeContext | `src/shared/contexts/ThemeContext.tsx` | State & persistence |
| CSS Variables | `src/index.css` | Light/dark color schemes |
| Settings Toggle | `src/user/components/UserSettingPage.tsx` | UI control |

### Theme Persistence Logic
1. **First Load**: Check `localStorage` for saved preference
2. **No Saved Preference**: Fall back to OS preference via `window.matchMedia('(prefers-color-scheme: dark)')`
3. **Subsequent Loads**: Use saved preference from localStorage

### Usage
```tsx
import { useTheme } from '@/shared/hooks/useTheme';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Switch
      checked={theme === 'dark'}
      onCheckedChange={toggleTheme}
    />
  );
}
```

### Shadow Adaptation
| Mode | Shadow Style |
|------|--------------|
| Light | `0 1px 3px rgba(0,0,0,0.1)` |
| Dark | `0 1px 3px rgba(0,0,0,0.3)` (softer) |

### Image Handling
Add filters if needed in dark mode for better contrast.

### Border Opacity
- Light mode: Higher contrast borders
- Dark mode: Softer, more subtle borders (`border-border/70`)

---

## Accessibility

### Color Contrast
| Element | Minimum Ratio |
|---------|---------------|
| Body text | 4.5:1 |
| Large text (18px+) | 3:1 |
| UI components | 3:1 |

### Focus Visibility
All interactive elements must have visible focus states:
```jsx
<button className="reading-focus">
  {/* focus-visible:ring-2 focus-visible:ring-ring */}
</button>
```

### Text Alternatives
- Use `alt` attribute for images
- Use `aria-label` for icon-only buttons
- Use `aria-describedby` for additional context

### Keyboard Navigation
- Ensure proper tab order
- All interactive elements must be keyboard accessible
- Use semantic HTML elements

### Screen Reader Support
```jsx
<span className="sr-only">Screen reader only text</span>
```

---

## Mobile Optimizations

### Touch Targets
Minimum touch target size: **44x44px**

```jsx
// Button with adequate touch target
<Button size="icon" className="size-11">
  <Icon />
</Button>
```

### Responsive Typography
```jsx
<h1 className="text-xl md:text-2xl">
  Heading
</h1>
```

### Responsive Spacing
```jsx
<div className="px-3 md:px-4">
  Content
</div>
```

### Card Layout
Stack cards vertically on mobile:
```jsx
<div className="flex flex-col md:flex-row">
  <Card />
  <Card />
</div>
```

### Mobile Navigation
- Compact header with well-spaced elements
- Bottom navigation for primary actions
- Avoid hover-dependent interactions

---

## Testing

### Manual Testing Checklist
1. Navigate to Settings page (`/settings`)
2. Toggle the theme switch
3. Verify theme persists after page reload
4. Clear localStorage and verify OS preference detection

### Automated Testing
```bash
npm test -- useTheme
```

### Browser Support
Works in all modern browsers that support:
- CSS custom properties
- `matchMedia` API
- `localStorage`
