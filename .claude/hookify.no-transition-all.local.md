---
name: no-transition-all
enabled: true
event: file
conditions:
  - field: new_text
    operator: regex_match
    pattern: transition-all
  - field: file_path
    operator: regex_match
    pattern: \.tsx?$
action: block
---

**`transition-all` is banned in this project.**

Always specify exact transition properties instead:

| What changes | Use |
|---|---|
| Only transform (scale, translate) | `transition-transform` |
| Only colors (bg, text, border) | `transition-colors` |
| Transform + background | `transition-[transform,background-color]` |
| Shadow only | `transition-shadow` |
| Multiple specific props | `transition-[transform,border-color,box-shadow]` |

`transition-all` animates every CSS property including ones you didn't intend, causing visual jank and performance overhead.
