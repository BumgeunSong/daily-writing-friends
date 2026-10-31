---
name: composable-layout
description: Use when writing or modifying page-level layout markup in apps/web — max-width containers, flex rows, vertical spacing — or composing multiple sections on a page. Enforces shared/ui layout primitives (ReadingColumn, Stack, Row) and compound-component slots over scattered Tailwind classes.
---

# Composable Layout

## Core Principle

**Own each layout token in exactly one place.** When `max-w-2xl`, `space-y-4`, or `flex items-center justify-between` repeats across components, the next refactor will miss one and the page silently misaligns on desktop.

Two tools enforce this:

1. **Layout primitives** in `@/shared/ui/` own width / spacing / flex tokens.
2. **Compound page layouts** expose named slots so each region inherits the column without repeating it.

## The Vocabulary

### `<ReadingColumn>` — page-width column

Owns `max-w-2xl`, `mx-auto`, `px-6`, `py-2`, `overflow-x-hidden`. Use at the top level of any reading-oriented page (post detail, editor, settings).

```tsx
<div className="min-h-screen bg-background">
  <ReadingColumn>
    <PostBackButton className="mb-4" />
    <article>...</article>
  </ReadingColumn>
</div>
```

Pass `as="div"` for non-`<main>`. Pass `className` to layer (e.g. `text-center` for error states).

### `<Stack gap="…">` — vertical rhythm

Owns `space-y-*`. Use instead of bare `<div className="space-y-4">` or stacked `mb-*` magic numbers.

| Token | Class | Use for |
|---|---|---|
| `xs` | `space-y-1` | inline label + value |
| `sm` | `space-y-2` | tight grouping (title + meta) |
| `md` | `space-y-4` | default body rhythm |
| `lg` | `space-y-6` | major blocks within a section |
| `xl` | `space-y-8` | cross-section gaps |

Use `asChild` to keep the semantic element:

```tsx
<Stack asChild gap="lg">
  <header>
    <Profile />
    <Stack gap="sm">
      <h1>{title}</h1>
      <Row justify="between">{meta}</Row>
    </Stack>
  </header>
</Stack>
```

### `<Row gap align justify>` — horizontal flex

Owns `flex` + `items-*` + `justify-*` + `gap-*`. Defaults: `align="center"`, `justify="start"`, `gap="md"`. Same gap tokens as `Stack`.

## When to Use Which

```
Vertical?
├─ Just spacing → <Stack gap="…">
└─ Page root with max-width → <ReadingColumn>

Horizontal? → <Row align="…" justify="…" gap="…">

3+ regions on a page that share a column? → Compound layout
```

## Compound Layouts for Pages

When a page has multiple top-level regions (back nav, article, action bar, comments) that share the column, build a compound component. The slots make "forgot the wrapper" structurally impossible.

```tsx
// post/components/PostDetailLayout.tsx
function PostDetailLayoutRoot({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <ReadingColumn>{children}</ReadingColumn>
    </div>
  );
}

function Article({ children }: { children: ReactNode }) {
  return <Stack asChild gap="md"><article>{children}</article></Stack>;
}

function Actions({ children }: { children: ReactNode }) {
  return (
    <Row justify="between" className="mt-6 border-t border-border py-4">
      {children}
    </Row>
  );
}

export const PostDetailLayout = Object.assign(PostDetailLayoutRoot, {
  Article,
  Actions,
  Comments: ({ children }) => <div className="mt-8">{children}</div>,
});
```

Usage:

```tsx
<PostDetailLayout>
  <PostBackButton className="mb-4" />
  <PostDetailLayout.Article>...</PostDetailLayout.Article>
  <PostDetailLayout.Actions>...</PostDetailLayout.Actions>
  <PostDetailLayout.Comments>...</PostDetailLayout.Comments>
</PostDetailLayout>
```

A new region added to this page can only sit inside an existing slot or extend the compound — it cannot forget `mx-auto max-w-2xl`.

## When to Extract a NEW Primitive

Apply the **deletion test**:

1. Find a className combination that appears in 2+ places.
2. Imagine deleting it from one site. Does the pattern still exist elsewhere?
3. Yes → extract. No → leave inline.

**One use site = inline. Two = real seam, extract.** Length of the className list is not the smell — repetition is.

## Anti-Patterns

### Magic spacing values

```tsx
// BAD — mb-6 and mb-2 are decisions hidden in the markup
<div className='mb-6'><Profile /></div>
<h1 className='mb-2 text-3xl'>{title}</h1>
<div className='flex items-center justify-between'>{meta}</div>

// GOOD — spacing is named, grouping is explicit
<Stack asChild gap="lg">
  <header>
    <Profile />
    <Stack gap="sm">
      <h1 className='text-3xl'>{title}</h1>
      <Row justify="between">{meta}</Row>
    </Stack>
  </header>
</Stack>
```

### Page width repeated on each child

```tsx
// BAD — every child must remember max-w-2xl. Miss one → desktop breaks.
<main className='max-w-4xl'>
  <article className='mx-auto max-w-2xl'>...</article>
  <div className='mx-auto max-w-2xl mt-6'>...</div>
  <div className='mx-auto max-w-2xl mt-8'>...</div>
</main>

// GOOD — the column owns the width; children inherit
<ReadingColumn>
  <article>...</article>
  <div className='mt-6'>...</div>
  <div className='mt-8'>...</div>
</ReadingColumn>
```

### Primitive built before it has 2 use sites

A `<Card>` only used by `PostCard` isn't a primitive — it's a renamed component with an indirection step. Wait for the second caller.

### `asChild` on a `<div>`

```tsx
// BAD — Stack already renders <div>
<Stack asChild gap="md"><div>...</div></Stack>

// GOOD — asChild only when swapping in <article>, <header>, <section>
<Stack asChild gap="md"><article>...</article></Stack>
```

### Arbitrary gap value bypassing the token

```tsx
// BAD — gap-3 isn't a token; next refactor won't know it exists
<Row className='gap-3'>...</Row>

// GOOD — pick the nearest token; if none fits, the scale needs to change, not this call site
<Row gap="sm">...</Row>
```

## Quick Reference

| Pattern | Primitive |
|---|---|
| Page max-width container | `<ReadingColumn>` |
| Vertical rhythm between siblings | `<Stack gap>` |
| Horizontal flex row | `<Row gap align justify>` |
| Page with 3+ semantic regions | Compound layout |

| Avoid | Replace with |
|---|---|
| `mb-*` between siblings | Wrap parent in `<Stack gap>` |
| `flex items-center justify-between` div | `<Row justify="between">` |
| Repeating `mx-auto max-w-2xl` | `<ReadingColumn>` at the root |
| Bare `<div>` only used for layout | One of the primitives above |
