# Motion

Animation should feel native — restrained, single-purpose, quiet. We aim for the
ethos of premium iOS and Android apps: motion confirms spatial relationships and
content changes without drawing attention to itself.

## Philosophy

- **Restraint over flair.** Short durations, one easing curve, no extra
  ornamentation. The animation is felt, not noticed.
- **Purpose per animation.** Every motion communicates one thing — depth,
  arrival, focus. If you can't name what it communicates, remove it.
- **Animate the change, not the container.** If a parent renders synchronously
  while its data loads asynchronously, animate the data, not the parent.
- **Direction conveys hierarchy.** Use directional slides only when navigation
  goes deeper or steps back. Sibling navigation gets no slide.
- **Reduced-motion is the floor.** Animations must work for users who disable
  motion. The universal `*` rule in `index.css` covers most cases; new
  animations still need verification.

## Design Tokens

All tokens live in `:root` in `apps/web/src/index.css`.

| Token | Value | Use |
|---|---|---|
| `--dwf-page-transition-duration` | `280ms` | Hierarchical route changes |
| `--dwf-content-transition-duration` | `560ms` | Async content arriving (Suspense reveals) |
| `--dwf-transition-easing` | `cubic-bezier(0.32, 0.72, 0, 1)` | iOS-style spring; one curve everywhere |

Never invent one-off durations or easing curves. Tune the tokens instead.

## Patterns

### Hierarchical page transitions

Navigating from list to detail or back. Animates the root element with a
directional slide.

```ts
import { useViewTransitionNavigate } from '@/shared/navigation/useViewTransitionNavigate';

const nav = useViewTransitionNavigate();
nav.forward('/board/{boardId}/post/{postId}');  // list → detail
nav.back();                                     // detail → list
```

Mechanism: the hook sets `document.documentElement.dataset.transition` to
`'forward'` or `'back'` before calling React Router. CSS rules keyed by the
attribute apply the directional slide via the `::view-transition-old(root)` and
`::view-transition-new(root)` pseudo-elements.

For `<Link>` elements that need view transitions (Notification items, etc.):

```tsx
import { Link } from '@/shared/navigation';
import { markPageTransitionForward } from '@/shared/navigation/useViewTransitionNavigate';

<Link to={href} viewTransition onClick={markPageTransitionForward}>...</Link>
```

This preserves Link semantics (right-click, middle-click open in new tab) while
opting into the directional transition.

### Async content reveal

When async data arrives — comments load, a list resolves, a lazy chunk
appears — apply `dwf-content-enter` to the element that mounts at the
ready-moment. The element slides up 20px and fades in over
`--dwf-content-transition-duration`.

```tsx
{!isReady ? null : (
  <div className="dwf-content-enter space-y-6">
    {items.map(...)}
  </div>
)}
```

**Critical rule**: apply the class to the leaf that actually mounts when data is
ready, not to its container. Mounting the wrapper synchronously and the data
asynchronously animates the wrong thing — typically a form input or empty
space appears with the reveal animation while the actual content arrives later
without one.

### Press feedback

All buttons inherit `active:scale-[0.96]` from the base `Button` component. Cards
and list items use `active:scale-[0.99]`. Both use
`transition-[transform,background-color] duration-200`.

Never use `transition-all`. Specify the exact properties.

## Anti-patterns

### Animating text via `view-transition-name`

The browser captures the named element as a bitmap before snapshotting, then
scales the bitmap. Text becomes blurry mid-flight. Even when source and
destination font sizes match, the bitmap path looks worse than instant.

Animate surfaces, backgrounds, or root containers — never the text itself.

### Directional slides for lateral navigation

Tab ↔ tab navigation, between siblings of equal depth, gets no directional
animation. A slide implies hierarchy where none exists.

### Multiple easing curves

One curve. Mixing iOS spring with Material standard with custom curves makes the
app feel inconsistent and amateur. The default is
`cubic-bezier(0.32, 0.72, 0, 1)`.

### Animating revalidation or background refresh

Silent. The data already exists; the user is not waiting; an animation here is
noise.

## Verification

Before claiming an animation is done:

1. Watch it once at full speed.
2. Throttle the network in DevTools (Fast 3G) to expose timing issues.
3. Enable `prefers-reduced-motion: reduce` emulation and confirm the animation
   is suppressed and the underlying interaction still works.
4. Test on Chrome and Edge (full View Transitions support) and Firefox (graceful
   degradation — instant transition, no errors).

## Reference

The framework that informs these patterns:

| Priority | Pattern | Communicates |
|---|---|---|
| 1 | Shared element (`view-transition-name`) | "Same thing — going deeper" |
| 2 | Suspense reveal | "Data loaded" |
| 3 | List identity (per-item key) | "Same items, new arrangement" |
| 4 | State change (enter/exit) | "Something appeared/disappeared" |
| 5 | Route change (layout-level) | "Going to a new place" |

In practice, this app uses priorities 2 and 5 — the root directional slide and
the Suspense reveal. Priority 1 (shared element) is deliberately avoided for
text because bitmap scaling blurs glyphs.
