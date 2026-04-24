---
name: image-outline
enabled: true
event: file
conditions:
  - field: new_text
    operator: regex_match
    pattern: <img\s
  - field: new_text
    operator: not_contains
    pattern: ring-
  - field: file_path
    operator: regex_match
    pattern: \.tsx?$
action: warn
---

**Image missing outline ring.**

User-uploaded images should have a subtle outline to prevent bleed on matching backgrounds:

```tsx
className="ring-1 ring-black/10 dark:ring-white/10"
```

Use pure black/white only — never tinted neutrals (slate, zinc, etc.) which pick up the surface color and look like dirt on the edge.

If this image is decorative or has its own container border, ignore this warning.
