---
name: small-touch-target
enabled: true
event: file
conditions:
  - field: new_text
    operator: regex_match
    pattern: (h-6\s|h-7\s|size-6\s|size-7\s)\s*
  - field: file_path
    operator: regex_match
    pattern: \.tsx?$
action: warn
---

**Possible touch target too small.**

Interactive elements need at least **40×40px** hit area (h-9 / size-9 minimum).

- `h-6` = 24px, `h-7` = 28px — both too small for comfortable tapping
- Use `size-9` (36px) for icon buttons, or add padding to extend the hit area
- If the element is not interactive (purely decorative), ignore this warning
