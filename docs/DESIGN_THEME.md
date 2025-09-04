Here’s your original content formatted in clean, readable Markdown style. All sections are preserved with proper headings, lists, code blocks, and spacing for easy reading and editing.

⸻

65 Detailed Guidelines for Implementing the Dual-Mode Reading Theme

(Dark Graphite + High Contrast)

⸻

Color System Implementation (Dual-Mode Theme) 1. CSS Variables Structure
Implement a complete dual-theme system using CSS custom properties:

:root {
/_ High Contrast Light Mode _/
--background: hsl(0, 0%, 100%);
--foreground: hsl(0, 0%, 9%);
--card: hsl(0, 0%, 100%);
--card-foreground: hsl(0, 0%, 9%);
--accent: hsl(210, 100%, 50%);
}

.dark {
/_ Dark Graphite Mode _/
--background: hsl(180, 4%, 12%);
--foreground: hsl(180, 3%, 92%);
--card: hsl(180, 4%, 16%);
--card-foreground: hsl(180, 3%, 92%);
--accent: hsl(210, 100%, 70%);
}

    2.	High Contrast Light Base

Use pure white for background: hsl(0, 0%, 100%) 3. Dark Text Hierarchy
• Primary: hsl(0, 0%, 9%)
• Secondary: hsl(0, 0%, 25%)
• Muted: hsl(0, 0%, 45%)
• Disabled: hsl(0, 0%, 65%) 4. Blue Accent Consistency
• Light: hsl(210, 100%, 50%)
• Dark: hsl(210, 100%, 70%) 5. Border and Separator System
• Light: hsl(0, 0%, 90%) / hsl(0, 0%, 80%)
• Dark: hsl(180, 4%, 22%) / hsl(180, 4%, 28%) 6. Card and Surface Elevation
• Light: white cards + subtle shadows
• Dark: charcoal cards + darker shadows 7. Interactive State Colors
• Light hover: hsl(210, 100%, 50%) @ 8%
• Light active: hsl(210, 100%, 45%)
• Light focus: 2px ring
• Dark hover: hsl(210, 100%, 70%) @ 10%
• Dark active: hsl(210, 100%, 65%)
• Dark focus: 2px ring 8. Input Field Styling
• Light: hsl(0, 0%, 98%) bg + hsl(0, 0%, 85%) border
• Dark: hsl(180, 4%, 18%) bg + hsl(180, 4%, 22%) border
• Focus: blue accent border 9. Selection and Highlight Colors
• Content highlights: Light hsl(210, 100%, 50%) @ 15% / Dark hsl(210, 100%, 70%) @ 20%
• Navigation selection: Light hsl(0, 0%, 95%) / Dark hsl(180, 4%, 18%) 10. Status Colors
• Error: Light hsl(0, 65%, 50%) / Dark hsl(0, 70%, 65%)
• Success: Light hsl(120, 45%, 40%) / Dark hsl(120, 50%, 60%)
• Warning: Light hsl(45, 85%, 45%) / Dark hsl(45, 90%, 65%)

⸻

Typography and Readability 11. Line Height: 1.7 (use leading-relaxed or text-reading) 12. Font Size Hierarchy:
• Body: 16px (1rem)
• Secondary: 14px
• Headings: 20px+ 13. Font Weight:
• Body: 400
• Emphasis: 500
• Headings: 600 14. Letter Spacing:
• Headings: -0.025em
• Body: normal 15. Text Rendering:
• text-rendering: optimizeLegibility
• Enable font-smoothing

⸻

Component Styling 16. Card Design: Use bg-card, border-border/50, and reading-shadow 17. Button Styling:
• Primary: bg-primary text-primary-foreground
• Secondary: bg-transparent hover:bg-accent/50 18. Badge Styling: bg-secondary/80, text-muted-foreground, px-2 py-0.5 19. Input Fields: bg-input, border-border, reading-focus 20. Header Design: bg-card border-b border-border, py-3

⸻

Content Presentation 21. Text Preview: line-clamp-3, prose-p:my-1.5 22. Image Presentation: rounded-lg, aspect-[x/y], reading-shadow 23. Link Styling: text-ring, no underline by default, underline on hover 24. List Formatting: prose-ol:my-1.5, prose-ul:my-1.5 25. Code Blocks: bg-muted, rounded-md, padded

⸻

Spacing and Layout 26. Vertical Rhythm: space-y-4, py-4 27. Container Width: container, px-4 28. Card Spacing: space-y-4, p-4 29. Section Margins: my-6 / py-6 for major, my-3 / py-3 for minor 30. Content Padding: px-4 py-3 (card), px-4 py-2 (headers)

⸻

Interactions and Animations 31. Hover States: reading-hover 32. Focus States: reading-focus 33. Transition Speed: transition-all duration-200 34. Active States: active:scale-[0.99] 35. Loading States: animate-pulse

⸻

Accessibility Considerations 36. Color Contrast: Min 4.5:1 (text), 3:1 (large text) 37. Focus Visibility: reading-focus 38. Text Alternatives: Use alt, aria-label 39. Keyboard Navigation: Ensure proper tab order and access 40. Screen Reader Text: Use sr-only

⸻

Mobile Optimizations 41. Touch Targets: ≥ 44×44px 42. Responsive Typography: Use text-xl md:text-2xl 43. Mobile Spacing: px-3 md:px-4 44. Card Layout: Stack vertically on mobile 45. Mobile Navigation: Compact header with spaced elements

⸻

Dual-Mode Implementation 46. Theme Toggle: Use next-themes 47. Shadow Adaptation: Softer shadows in dark mode 48. Image Handling: Add filters if needed in dark mode 49. Border Opacity: Higher contrast in light, softer in dark 50. System Preference: Respect default system setting

⸻

Technical Implementation 51. CSS Utility Classes: Define reading-shadow, reading-focus, etc. 52. Theme Provider: Use next-themes in layout 53. CSS Variables: Use HSL custom properties 54. Consistent Imports: e.g. @/shared/ui/button 55. Quality Checks: Use automated tools and manual review

⸻

Bear App Style Implementation (심플하고 프리미엄한 느낌) 56. Minimal Borders: Use bg-card, remove border-b 57. Content-First Approach: Remove decorative wrappers 58. Visual Hierarchy Simplification: Only reading-shadow, border-border/50 59. Premium Simplicity: Less visual noise = more premium feel 60. Natural Content Flow: Avoid artificial boundaries 61. Selection Color Strategy: Distinct accent vs selection colors
• Blue accent (`hsl(210, 100%, 50%)` light / `hsl(210, 100%, 70%)` dark) for interactive elements, links, buttons
• Neutral gray selection (`hsl(0, 0%, 95%)` light / `hsl(180, 4%, 18%)` dark) for navigation states
• Purpose: Prevents visual competition, maintains distraction-free reading experience
• Implementation: Use accent for content highlights, selection for sidebar/navigation active states

⸻
