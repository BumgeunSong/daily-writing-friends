# Component Styling

Guidelines for styling common UI components in the dual-mode reading theme.

## Cards

### Basic Card
```jsx
<div className="bg-card border-border/50 reading-shadow rounded-lg p-4">
  {/* Card content */}
</div>
```

### Card Principles
- Use `bg-card` for background
- Subtle borders: `border-border/50`
- Soft shadows: `reading-shadow`
- Remove decorative wrappers for premium feel

### Surface Elevation
| Mode | Style |
|------|-------|
| Light | White cards + subtle shadows |
| Dark | Charcoal cards + darker shadows |

---

## Input Fields

### Basic Input
```jsx
<input className="bg-input border-border reading-focus rounded-md px-3 py-2" />
```

### Input Styling
| Mode | Background | Border |
|------|------------|--------|
| Light | `hsl(0, 0%, 98%)` | `hsl(0, 0%, 85%)` |
| Dark | `hsl(180, 4%, 18%)` | `hsl(180, 4%, 22%)` |

Focus state uses blue accent border via `reading-focus`.

### Utility Class
```jsx
<input className="input-dual" />
```

---

## Badges

### Basic Badge
```jsx
<span className="bg-secondary/80 text-muted-foreground rounded px-2 py-0.5 text-sm">
  Badge
</span>
```

---

## Links

### Link Styling
```jsx
<a className="text-ring hover:underline">Link text</a>
```

- Color: `text-ring` (accent color)
- No underline by default
- Underline on hover

---

## Lists

### Prose Lists
```jsx
<ul className="prose-ul:my-1.5">
  <li>Item</li>
</ul>

<ol className="prose-ol:my-1.5">
  <li>Item</li>
</ol>
```

---

## Code Blocks

```jsx
<code className="bg-muted rounded-md px-2 py-1">
  code
</code>
```

---

## Text Preview

For truncated content:
```jsx
<p className="line-clamp-3 prose-p:my-1.5">
  Long text content...
</p>
```

---

## Images

```jsx
<img className="rounded-lg reading-shadow aspect-[16/9]" />
```

---

## Interactions

### Hover States
```jsx
<div className="reading-hover">
  {/* Subtle accent highlight on hover */}
</div>
```

### Focus States
```jsx
<button className="reading-focus">
  {/* 2px ring on focus */}
</button>
```

### Transitions
```jsx
<div className="transition-all duration-200">
  {/* Smooth transitions */}
</div>
```

### Active States
```jsx
<button className="active-scale">
  {/* Scale down slightly on press */}
</button>
```

Or manually:
```jsx
<button className="active:scale-[0.99]">
```

### Loading States
```jsx
<div className="animate-pulse">
  {/* Skeleton loading */}
</div>
```

---

## Navigation

### Selected State
```jsx
<div className="nav-selected">
  {/* Neutral selection background */}
</div>
```

### Hover State
```jsx
<div className="nav-hover">
  {/* Subtle hover effect */}
</div>
```

---

## Bear App Style (Premium Minimal)

### Principles
1. **Minimal borders** - Use `bg-card`, avoid excessive `border-b`
2. **Content-first** - Remove decorative wrappers
3. **Visual hierarchy** - Only `reading-shadow`, `border-border/50`
4. **Natural flow** - Avoid artificial boundaries
5. **Less noise = premium feel**

### Selection Strategy
- **Blue accent** for interactive elements (links, buttons)
- **Neutral gray** for navigation states
- Prevents visual competition, maintains distraction-free reading
