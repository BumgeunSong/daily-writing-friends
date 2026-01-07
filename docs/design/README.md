# Design System

This directory contains the design guidelines for DailyWritingFriends app.

## Documents

| File | Description |
|------|-------------|
| [tokens.md](./tokens.md) | Design tokens: colors, typography, spacing |
| [buttons.md](./buttons.md) | Button hierarchy and usage guidelines |
| [components.md](./components.md) | Component styling: cards, inputs, badges, interactions |
| [theme.md](./theme.md) | Theming: dark mode, accessibility, mobile optimizations |

## Quick Reference

### Color System
- **Accent**: `hsl(210, 100%, 50%)` (light) / `hsl(210, 100%, 70%)` (dark)
- **Primary**: Dark text on light, light text on dark
- See [tokens.md](./tokens.md) for full color palette

### Button Hierarchy
1. **CTA** - Critical conversion actions (signup, main FAB)
2. **Primary** - Main interactions (login, save, submit)
3. **Secondary** - Supporting actions (drafts, cancel)
4. **Ghost** - Subtle actions (edit, navigation)
5. **Destructive** - Dangerous actions (delete)

See [buttons.md](./buttons.md) for detailed usage

### Theme Strategy
- Tailwind CSS `darkMode: 'class'`
- CSS custom properties for semantic colors
- System preference detection with localStorage persistence

See [theme.md](./theme.md) for implementation details
