---
name: daily-writing-friends-design
description: Design system for Daily Writing Friends app. MUST use when doing ANY UI work including components, pages, buttons, forms, styling, Tailwind CSS, dark mode, theming, layouts, cards, inputs, or visual changes. Ensures consistent design tokens, button hierarchy, and accessibility.
---

# Daily Writing Friends Design System

Follow these guidelines for ALL UI-related work in this project.

## Design Documentation

For detailed reference, see the design docs:
- [tokens.md](../../../docs/design/tokens.md) - Colors, typography, spacing
- [buttons.md](../../../docs/design/buttons.md) - Button hierarchy and usage
- [components.md](../../../docs/design/components.md) - Cards, inputs, interactions
- [theme.md](../../../docs/design/theme.md) - Dark mode, accessibility, mobile
- [motion.md](../../../docs/design/motion.md) - View transitions, content reveals, easing

---

## Quick Reference

### Color System (CSS Variables)

```css
/* Light Mode */
--background: hsl(0, 0%, 100%);
--foreground: hsl(0, 0%, 9%);
--accent: hsl(210, 100%, 50%);

/* Dark Mode */
--background: hsl(180, 4%, 12%);
--foreground: hsl(180, 3%, 92%);
--accent: hsl(210, 100%, 70%);
```

### Button Hierarchy (Most to Least Important)

| Variant | Use For | Example |
|---------|---------|---------|
| `cta` | Critical conversions | Signup, Join, Main FAB |
| `default` | Main interactions | Login, Save, Submit |
| `outline` | Supporting actions | Drafts, Cancel |
| `ghost` | Subtle actions | Edit, Navigation, Logout |
| `destructive` | Dangerous actions | Delete (red ghost style) |

```tsx
// CTA - most important
<Button variant="cta">회원가입</Button>

// Primary - main action
<Button variant="default">글 저장</Button>

// Secondary - supporting
<Button variant="outline">임시 저장 글</Button>

// Ghost - subtle
<Button variant="ghost">수정</Button>

// Destructive - dangerous (ghost style with red text)
<Button variant="destructive">삭제</Button>
```

### Ghost Button Override Pattern

When ghost buttons need consistent styling on hover:
```tsx
<Button
  variant="ghost"
  className="text-foreground hover:bg-transparent hover:text-foreground"
>
```

### Component Styling

```tsx
// Card
<div className="bg-card border-border/50 reading-shadow rounded-lg p-4">

// Input
<input className="bg-input border-border reading-focus" />

// Link
<a className="text-ring hover:underline">
```

### Utility Classes

| Class | Purpose |
|-------|---------|
| `reading-shadow` | Adaptive shadow (light/dark) |
| `reading-hover` | Subtle accent highlight on hover |
| `reading-focus` | Focus ring (2px accent) |
| `text-reading` | Optimized reading (line-height 1.7) |
| `nav-selected` | Navigation selection state |
| `active-scale` | Press feedback (scale 0.99) |

### Dark Mode

- Strategy: Tailwind `darkMode: 'class'`
- Toggle: `useTheme()` hook from `@/shared/hooks/useTheme`
- Persistence: localStorage with OS preference fallback

```tsx
import { useTheme } from '@/shared/hooks/useTheme';

const { theme, toggleTheme } = useTheme();
```

### Spacing

- Major sections: `my-6` / `py-6`
- Minor sections: `my-3` / `py-3`
- Default: `space-y-4`, `p-4`
- Mobile: `px-3 md:px-4`

### Accessibility

- Touch targets: minimum 44px (`size-11` / `h-11`) by default; 36px (`size-9` / `h-9`) allowed for dense UI where space is constrained
- Color contrast: 4.5:1 for text, 3:1 for large text
- Focus visibility: use `reading-focus`
- Screen reader: use `sr-only` for hidden text

---

## UI Polish Baseline

These rules are **mandatory** for all UI work. They prevent the most common issues that make interfaces feel off.

### Never use `transition-all`

Always specify exact properties. `transition-all` animates unrelated properties and causes jank.

```tsx
// BAD
className="transition-all duration-200"

// GOOD - specify what actually changes
className="transition-transform duration-200"
className="transition-[transform,background-color] duration-200"
className="transition-colors duration-200"
```

### Minimum 36px touch targets

Every interactive element must have at least 36×36px hit area (size-9). If the visible element is smaller, extend with padding.

```tsx
// BAD - 24px tall
<Button size='sm' className='h-6 px-2'>

// GOOD - 36px minimum for icon buttons
<Button size='icon' className='size-9'>
```

### Tabular numbers on dynamic counts

Any number that changes dynamically must use `tabular-nums` to prevent layout shift.

```tsx
<span className="tabular-nums">{count}</span>
```

### Image outlines

All user-uploaded images (avatars, thumbnails) need a subtle outline to prevent bleed on matching backgrounds. Use pure black/white only — never tinted neutrals.

```tsx
// On elements inside overflow-hidden containers, use ring-inset
className="ring-1 ring-inset ring-black/10 dark:ring-white/10"

// On elements without overflow clipping
className="ring-1 ring-black/10 dark:ring-white/10"
```

### Concentric border radius

When nesting rounded elements, outer radius = inner radius + padding. Mismatched radii is the #1 thing that makes UIs feel off.

### Shadows over borders for major surfaces

Use layered `box-shadow` instead of hard borders for major surface dividers (nav bars, toolbars). Borders are fine for content separators (`border-border/50`).

### Press feedback on buttons

All buttons get `active:scale-[0.96]` via the base Button component. Cards and list items use `active:scale-[0.99]`.

### Text wrapping

- Headings: `text-wrap: balance` (Tailwind: `text-balance`)
- Body text: `text-wrap: pretty` (Tailwind: `text-pretty`)

---

## Motion & Transitions

Animation should feel native — restrained, single-purpose, quiet. Premium iOS and Android apps don't dazzle; they confirm spatial relationships and content changes. If you can't say what an animation communicates, cut it.

### Design tokens

Defined in `:root` in `apps/web/src/index.css`. Use these. Don't invent one-off durations.

| Token | Value | Use for |
|---|---|---|
| `--dwf-page-transition-duration` | `280ms` | Hierarchical route changes |
| `--dwf-content-transition-duration` | `560ms` | Async content arriving (Suspense reveals) |
| `--dwf-transition-easing` | `cubic-bezier(0.32, 0.72, 0, 1)` | iOS-style spring; one curve everywhere |

### When to animate

| Pattern | Animation | Communicates |
|---|---|---|
| Hierarchical navigation (list → detail) | Directional root slide via `useViewTransitionNavigate().forward()` | "Going deeper" |
| Hierarchical back (detail → list) | Opposite slide via `useViewTransitionNavigate().back()` | "Going back up" |
| Suspense reveal (data loaded) | `.dwf-content-enter` class on the element that mounts when data is ready | "Content arrived" |
| Lateral navigation (tab ↔ tab) | None | No depth to communicate |
| Background refresh / revalidation | None | Silent by design |
| Press feedback | `active:scale-[0.96]` (button) or `active:scale-[0.99]` (card) | "Touch received" |

### Rules

- **Direction conveys hierarchy.** Forward slides right-to-left, back slides left-to-right. Never apply directional slides to sibling navigation — they falsely imply depth.
- **Animate the moment of change, not the container.** If a wrapper renders synchronously while its data loads asynchronously, animate the data — not the wrapper.
- **Never set `view-transition-name` on text.** The browser captures the element as a bitmap and scales bitmaps blurrily. Animate surfaces and backgrounds, not glyphs.
- **One easing curve per app.** Multiple curves feel chaotic; one curve feels intentional.
- **Reduced-motion is the floor.** The universal `*` rule in `index.css` covers most cases — verify each new animation by emulating `prefers-reduced-motion: reduce` in DevTools.

### Implementation

```ts
import { useViewTransitionNavigate } from '@/shared/navigation/useViewTransitionNavigate';

const nav = useViewTransitionNavigate();
nav.forward('/board/.../post/...');  // list → detail
nav.back();                          // detail → list
```

For async content reveals, apply `dwf-content-enter` to the element that mounts the moment the data is ready — the leaf, not the parent.

See [motion.md](../../../docs/design/motion.md) for the deeper reference.

---

## Principles

1. **Premium minimal** - Less visual noise, Bear app style
2. **Content-first** - Remove decorative wrappers
3. **Consistent hierarchy** - Follow button/color hierarchy strictly
4. **Dual-mode** - All UI must work in both light and dark modes
5. **Mobile-first** - Responsive spacing and touch targets
6. **Polish baseline** - Follow UI Polish Baseline rules above on every change
7. **Native motion** - Apply Motion & Transitions rules: restraint, single-purpose, one easing curve, never animate text
