# Design Tokens

Design tokens for the dual-mode reading theme (Dark Graphite + High Contrast Light).

## Color System

### CSS Variables Structure

```css
:root {
  /* High Contrast Light Mode */
  --background: hsl(0, 0%, 100%);
  --foreground: hsl(0, 0%, 9%);
  --card: hsl(0, 0%, 100%);
  --card-foreground: hsl(0, 0%, 9%);
  --accent: hsl(210, 100%, 50%);
}

.dark {
  /* Dark Graphite Mode */
  --background: hsl(180, 4%, 12%);
  --foreground: hsl(180, 3%, 92%);
  --card: hsl(180, 4%, 16%);
  --card-foreground: hsl(180, 3%, 92%);
  --accent: hsl(210, 100%, 70%);
}
```

### Background Colors
- **Light**: `hsl(0, 0%, 100%)` - Pure white
- **Dark**: `hsl(180, 4%, 12%)` - Dark graphite

### Text Hierarchy
| Level | Light Mode | Dark Mode |
|-------|------------|-----------|
| Primary | `hsl(0, 0%, 9%)` | `hsl(180, 3%, 92%)` |
| Secondary | `hsl(0, 0%, 25%)` | `hsl(180, 3%, 75%)` |
| Muted | `hsl(0, 0%, 45%)` | `hsl(180, 3%, 65%)` |
| Disabled | `hsl(0, 0%, 65%)` | `hsl(180, 3%, 45%)` |

### Accent Colors
- **Light**: `hsl(210, 100%, 50%)` - Blue
- **Dark**: `hsl(210, 100%, 70%)` - Lighter blue

### Border and Separator
| Type | Light Mode | Dark Mode |
|------|------------|-----------|
| Border | `hsl(0, 0%, 90%)` | `hsl(180, 4%, 22%)` |
| Separator | `hsl(0, 0%, 80%)` | `hsl(180, 4%, 28%)` |

### Status Colors
| Status | Light Mode | Dark Mode |
|--------|------------|-----------|
| Error | `hsl(0, 65%, 50%)` | `hsl(0, 70%, 65%)` |
| Success | `hsl(120, 45%, 40%)` | `hsl(120, 50%, 60%)` |
| Warning | `hsl(45, 85%, 45%)` | `hsl(45, 90%, 65%)` |

### Interactive States
| State | Light Mode | Dark Mode |
|-------|------------|-----------|
| Hover | `hsl(210, 100%, 50%) @ 8%` | `hsl(210, 100%, 70%) @ 10%` |
| Active | `hsl(210, 100%, 45%)` | `hsl(210, 100%, 65%)` |
| Focus | 2px ring | 2px ring |

### Selection Colors
- **Content highlight**: Light `hsl(210, 100%, 50%) @ 15%` / Dark `hsl(210, 100%, 70%) @ 20%`
- **Navigation selection**: Light `hsl(0, 0%, 95%)` / Dark `hsl(180, 4%, 18%)`

Blue accent for interactive elements, neutral gray for navigation states.

---

## Typography

### Line Height
- **Body text**: `1.7` (use `leading-relaxed` or `text-reading`)
- **Compact text**: `1.6` (use `text-reading-sm`)

### Font Size Hierarchy
| Element | Size |
|---------|------|
| Body | 16px (1rem) |
| Secondary | 14px |
| Headings | 20px+ |

### Font Weight
| Element | Weight |
|---------|--------|
| Body | 400 |
| Emphasis | 500 |
| Headings | 600 |

### Letter Spacing
- **Headings**: `-0.025em`
- **Body**: normal

### Text Rendering
```css
text-rendering: optimizeLegibility;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

Use the `.text-reading` utility class for optimal reading experience.

---

## Spacing

### Vertical Rhythm
- Major sections: `my-6` / `py-6`
- Minor sections: `my-3` / `py-3`
- Default: `space-y-4`, `py-4`

### Container
- Width: `container`
- Padding: `px-4`

### Card Spacing
- Internal: `space-y-4`, `p-4`
- Content padding: `px-4 py-3`
- Header padding: `px-4 py-2`

### Responsive Spacing
```jsx
// Mobile-first approach
<div className="px-3 md:px-4">
```
