# Button UI System Guide

## Button Hierarchy

### 1. CTA (Call-to-Action)
**Purpose**: The most important button for critical user conversion actions
**Use Cases**: 
- **Join/Signup actions** (회원가입, 기수 신청하기)
- **Main writing action button** (floating action button in WritingActionButton.tsx)
- **Key conversion actions** that drive user engagement

**Usage**: `<Button variant="cta">`

### 2. Primary (Default)
**Purpose**: Common action buttons for main interactions
**Use Cases**: 
- **Login** (로그인)
- **Post saving** (글 저장)
- **Start writing actions** (프리라이팅 시작하기, 글쓰기 시작)
- **Topic card actions** (writing prompts)
- **Sub-action buttons** in WritingActionButton (프리라이팅, 일반 글쓰기, 글감 목록)
- **Form submissions** and navigation between states

**Usage**: `<Button>` or `<Button variant="default">`

### 3. Secondary (Outline)
**Purpose**: Less important actions, outline style
**Use Cases**: 
- **임시 저장 글** (Draft Posts) in PostCreationPage
- **Cancel actions**
- **Alternative options**
- **Supporting buttons** that complement primary actions

**Usage**: `<Button variant="outline">`

### 4. Destructive
**Purpose**: Dangerous actions requiring confirmation (ghost style with red text to be less intimidating)
**Use Cases**: 
- **Delete post** (게시물 삭제)
- **Delete cache** (캐시 삭제)
- **Irreversible operations** that modify or remove data

**Usage**: `<Button variant="destructive">` (renders as ghost with red text, no border)

### 5. Ghost
**Purpose**: Most subtle button, text-only or simple icon
**Use Cases**: 
- **Edit buttons** in PostDetailPage
- **Comment/reply actions** (edit, delete comments)
- **Logout button** (로그아웃)
- **Icon-only buttons** (navigation, share, back)
- **Subtle navigation** and secondary interactions

**Usage**: `<Button variant="ghost">`

## Current Implementation Status

### Button Variants in `@/shared/ui/button.tsx`:
- ✅ `default` - Primary button (filled, main color)
- ✅ `destructive` - Destructive actions
- ✅ `outline` - Secondary button (outline style)
- ✅ `ghost` - Subtle text/icon button
- ⚠️ `cta` - Currently same as secondary, needs accent color

### Required Updates:
1. **CTA Variant**: Update to use accent color instead of secondary
2. **Documentation**: Add JSDoc comments to button variants
3. **Examples**: Create example usage in Storybook (if available)

## Recommended Button Styles

### CTA Button Enhancement
```typescript
cta: "bg-accent text-accent-foreground font-semibold shadow-md hover:bg-accent/90 focus-visible:ring-accent"
```

### Color System Reference
Based on `DESIGN_THEME.md`:
- **Accent Colors**: 
  - Light: `hsl(210, 100%, 50%)`
  - Dark: `hsl(210, 100%, 70%)`

## Usage Examples

### PostCreationPage.tsx
```jsx
// Secondary (current: outline)
<Button variant="outline">임시 저장 글</Button>

// Primary (current: default)
<Button type="submit">글 저장</Button>
```

### WritingActionButton.tsx
```jsx
// CTA for main writing action (floating action button)
<Button variant="cta" size="icon">
  <Plus className="size-5" />
</Button>

// Primary for sub-actions
<Button variant="default" size="sm">
  <Sparkle className="size-4" />
</Button>
```

### PostDetailPage.tsx
```jsx
// Ghost for subtle edit actions
<Button variant="ghost" size="icon">
  <Edit className="h-4 w-4" />
</Button>
```

### Authentication Pages
```jsx
// CTA for signup/join (most important conversion)
<Button variant="cta">회원가입</Button>
<Button variant="cta">기수 신청하기</Button>

// Primary for login
<Button variant="default">로그인</Button>
```

### Comment/Reply Actions
```jsx
// Ghost for subtle comment actions
<Button variant="ghost" size="sm">
  <Edit className="h-4 w-4" />
</Button>

// Destructive for delete actions (ghost style with red text)
<Button variant="destructive" size="sm">
  <Trash2 className="h-4 w-4" />
</Button>
```

## Design Principles

1. **Visual Hierarchy**: CTA > Primary > Secondary > Ghost > Destructive
2. **Accessibility**: All buttons maintain proper contrast ratios
3. **Consistency**: Use consistent button hierarchy across all pages
4. **Touch Targets**: Minimum 44px touch target for mobile
5. **Loading States**: Show loading indicators for async actions

## Implementation Checklist

- [ ] Update CTA variant to use accent color (following shadcn patterns)
- [ ] Add JSDoc documentation to button variants
- [ ] Remove inconsistent custom styling patterns
- [ ] Update buttons to use correct hierarchy:
  - [ ] Join/Signup → CTA
  - [ ] Login → Primary
  - [ ] Post saving/Start writing → Primary
  - [ ] Comment/reply edit → Ghost
  - [ ] Delete post/cache → Destructive
  - [ ] Logout → Ghost
- [ ] Ensure all buttons follow shadcn button patterns
- [ ] Test color contrast ratios
- [ ] Ensure mobile touch targets meet accessibility standards

## Button Classification Summary

### **CTA Buttons** (Most Important - Accent Color)
- Join/Signup actions (회원가입, 기수 신청하기)
- Main writing action button (floating action button)
- User conversion actions

### **Primary Buttons** (Important - Main Color)
- Login (로그인)
- Post saving (글 저장)
- Start writing/freewriting (글쓰기 시작, 프리라이팅 시작하기)
- Topic card actions
- Sub-action buttons (프리라이팅, 일반 글쓰기, 글감 목록)
- Form submissions

### **Secondary Buttons** (Supporting - Outline)
- Draft posts (임시 저장 글)
- Cancel actions
- Alternative options

### **Destructive Buttons** (Dangerous - Red Ghost)
- Delete post (게시물 삭제)
- Delete cache (캐시 삭제)
- Irreversible operations
- **Style**: Ghost style with red text, no border (subtle and less intimidating)

### **Ghost Buttons** (Subtle - Minimal)
- Edit buttons
- Comment/reply actions
- Logout (로그아웃)
- Icon-only navigation
- Share, back buttons