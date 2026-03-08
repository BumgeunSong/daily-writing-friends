# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Admin dashboard for Daily Writing Friends platform - a social writing platform where users write daily, interact through comments, and participate in writing communities/boards.

**Tech Stack**: Next.js 15 + React 18 + TypeScript + Firebase (Auth, Firestore, Storage, FCM) + Tailwind CSS v4 + shadcn/ui

## Development Commands

```bash
# Development server with Turbopack
npm run dev

# Production build
npm run build

# Production server  
npm run start

# Lint code
npm run lint
```

## Project Architecture

### Core Structure
- **Next.js App Router** with TypeScript and strict mode
- **Firebase Integration**: Auth (Google OAuth), Firestore, Storage, FCM (push notifications), Admin SDK
- **State Management**: TanStack React Query v5 for server state caching
- **UI Components**: shadcn/ui components with Radix UI primitives, Lucide icons
- **Authentication**: Admin-only access with automatic redirection

### Key Directories
```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard pages
│   │   ├── boards/        # Board management
│   │   ├── messaging/     # FCM messaging admin  
│   │   ├── narration/     # Narration guide recording
│   │   ├── posts/         # Post management
│   │   ├── settings/      # Admin settings
│   │   ├── user-approval/ # User approval workflow
│   │   ├── user-churn/    # User churn analysis
│   │   └── users/         # User management
│   ├── api/               # API routes (FCM endpoint)
│   └── login/             # Authentication page
├── components/            # React components
│   ├── admin/            # Admin-specific components
│   │   └── narration/    # Narration recording components
│   └── ui/               # shadcn/ui components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── types/                # TypeScript type definitions
└── apis/                 # API client functions
```

## Database Schema (Firestore)

### Main Collections
- **users**: User profiles with subcollections:
  - `notifications`: User interaction notifications
  - `writingHistories`: Daily writing records
  - `postings`: User's posts
  - `commenting`: User's comments
  - `replying`: User's replies
  - `firebaseMessagingTokens`: FCM device tokens
  
- **boards**: Writing communities with subcollections:
  - `posts`: Board posts with `comments` and `replies` subcollections
  - `reviews`: Board reviews
  
- **narrations**: Audio guide recordings with subcollection:
  - `sections`: Individual narration sections with audio files

### Key Relationships
- Users have board permissions (read/write/admin)
- Posts belong to boards and users  
- Complex notification system tracking user interactions
- FCM token management for push notifications
- Narration sections stored in Firebase Storage

## Configuration

### TypeScript Config
- Path aliases: `@/*` → `./src/*`
- Strict mode enabled
- ES2017 target with ESNext modules

### shadcn/ui Setup
- New York style configuration
- Components in `src/components/ui/`
- Tailwind CSS v4 with CSS variables

### Required Environment Variables
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

## Development Patterns

### Custom Hooks Pattern
Key hooks for data fetching and state management:
- `useAuth`: Firebase authentication state
- `useCollection`/`useDocument`: Firestore real-time data
- `useAllFCMTokens`: FCM token management
- `useNarrations`/`useNarrationSections`: Narration CRUD operations
- `useAudioRecorder`: Browser audio recording with MediaRecorder API

### Component Organization
- UI components (`components/ui/`) - Reusable shadcn/ui components
- Feature components (`components/admin/`) - Business logic components
- Page components (`app/admin/`) - Route-specific pages
- Responsive design with mobile-first approach

### Type Safety
- Comprehensive TypeScript interfaces in `types/firestore.ts`
- Proper Firebase Timestamp handling
- Strong typing for all Firestore documents

## Key Features

### User Management
- User approval workflow for new registrations
- User information and profile management
- Board permission management (read/write/admin)
- User churn analysis

### Content Management  
- Board (writing community) CRUD operations
- Post management and moderation
- Comment and reply oversight
- Writing history tracking

### Narration Recording (New)
- Create and manage narration guides
- Record audio sections with browser MediaRecorder API
- Upload audio files to Firebase Storage
- Manage narration sections with pause timing

### FCM Integration
- Push notification management via API route
- Device token tracking per user
- Bulk messaging capabilities
- User agent detection for device identification

### Admin Dashboard
- Sidebar navigation with collapsible menu
- User activity tracking (writing histories, postings, commenting)
- Responsive design for mobile and desktop
- Real-time data updates with Firestore listeners

## Code Quality

### Linting & Formatting
- ESLint with Next.js, TypeScript, and Prettier configs
- Run `npm run lint` before committing

### Testing Approach
Check package.json and project documentation for test commands

### Firebase Security
- Security rules defined in `firestore.rules` and `storage.rules`
- Admin SDK for server-side operations in API routes