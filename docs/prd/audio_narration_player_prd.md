# Audio Narration Player PRD

## Overview
A feature that provides audio narration guidance to help users write more easily. Users can listen to curated audio narrations while writing, with a persistent audio player that follows them across the application.

## Problem Statement
Users may benefit from audio guidance and prompts while writing to:
- Overcome writer's block
- Stay focused on their writing task
- Receive structured writing guidance
- Make the writing experience more engaging and interactive

## Goals
1. Provide seamless audio narration playback during writing sessions
2. Create a non-intrusive but easily accessible audio player interface
3. Support persistent playback across page navigation
4. Enable users to discover and select from multiple narrations

## User Stories

### As a writer
- I want to browse available narrations before starting to write
- I want to play audio guidance while writing my post
- I want to pause/resume narration at any time
- I want the audio to continue playing when I navigate between pages
- I want to see what narration is currently playing
- I want to close the player when I'm done listening

### As a content creator
- I want to upload narrations with multiple sections
- I want to specify pause durations between sections
- I want to organize narrations by topic or purpose

## Technical Architecture

### Data Model

#### Firestore Collections
```
/narrations/{narrationId}
  - id: string
  - title: string
  - content: string
  - createdBy: string
  - createdAt: Timestamp
  - updatedAt: Timestamp

/narrations/{narrationId}/sections/{sectionId}
  - id: string
  - title: string
  - script: string
  - pauseMinutes: number
  - storagePath: string (Firebase Storage path)
  - createdAt: Timestamp
  - updatedAt: Timestamp
```

#### Firebase Storage
- Audio files stored at paths specified in `storagePath`
- Format: `audio/webm;codecs=opus`

### Component Architecture

```
src/narration/
├── api/
│   └── narration.ts          # Firestore queries
├── components/
│   ├── NarrationList.tsx     # List of available narrations
│   ├── AudioPlayer.tsx       # Sticky player UI component
│   └── NarrationSelector.tsx # Selection modal/page
├── hooks/
│   ├── useNarrationPlayer.ts # Core playback logic
│   └── useNarrations.ts      # Data fetching hooks
├── model/
│   └── Narration.ts          # TypeScript types (existing)
└── utils/
    └── audioUtils.ts         # Audio helper functions

src/shared/contexts/
└── AudioPlayerContext.tsx    # Global audio state management
```

## Features

### Phase 1: Core Player (MVP)

#### 1. Audio Player UI
- **Sticky positioning**: Configurable top or bottom placement
- **Controls**: Play/pause button, close button
- **Display**: Current narration title, elapsed time
- **Responsive**: Adapts to mobile and desktop layouts

#### 2. Narration Selection
- List view of available narrations
- Preview narration details (title, description, duration)
- One-click selection to start playing
- Integration with WritingActionButton menu

#### 3. Playback Management
- Play audio from Firebase Storage URLs
- Handle section transitions with pause intervals
- Persist playback state across navigation
- Resume from last position on app reload

#### 4. Integration Points
- Add "Write with Narration" option to WritingActionButton
- Show player on writing-related pages initially
- Adjust page layouts to accommodate player

### Phase 2: Enhanced Features (Future)

#### 1. Advanced Controls
- Progress bar with seek functionality
- Playback speed adjustment (0.5x, 1x, 1.5x, 2x)
- Skip to next/previous section
- Volume control

#### 2. User Preferences
- Remember player position preference (top/bottom)
- Auto-play settings
- Default playback speed

#### 3. Offline Support
- Download narrations for offline use
- Cache management
- Sync playback position

#### 4. Analytics
- Track narration usage
- Measure completion rates
- Identify popular narrations

## User Interface

### Audio Player States

#### Collapsed (Default)
```
┌─────────────────────────────────────┐
│ ▶ Introduction to Freewriting  3:45 X│
└─────────────────────────────────────┘
```

#### Playing
```
┌─────────────────────────────────────┐
│ ⏸ Introduction to Freewriting  3:45 X│
└─────────────────────────────────────┘
```

### Position Options

#### Top Position
- Below app header
- Above page content
- Adds top padding to content

#### Bottom Position
- Above bottom navigation
- Below page content
- Adds bottom padding to content

### Narration List View
```
┌─────────────────────────────────────┐
│ Select a Narration                  │
├─────────────────────────────────────┤
│ 📻 Introduction to Freewriting      │
│    5 sections • 15 minutes          │
├─────────────────────────────────────┤
│ 📻 Overcoming Writer's Block        │
│    3 sections • 10 minutes          │
├─────────────────────────────────────┤
│ 📻 Daily Reflection Prompts         │
│    7 sections • 20 minutes          │
└─────────────────────────────────────┘
```

## Implementation Plan

### Week 1: Foundation
1. Create AudioPlayerContext for global state
2. Build basic AudioPlayer component
3. Implement audio playback with HTML5 audio
4. Add player to BottomNavigatorLayout

### Week 2: Data Integration
1. Create Firestore queries for narrations
2. Build NarrationList component
3. Implement narration selection flow
4. Connect to Firebase Storage for audio files

### Week 3: Polish & Testing
1. Handle edge cases and errors
2. Add loading and error states
3. Implement section transitions
4. Test across different devices

### Week 4: Configuration & Launch
1. Add position configuration (top/bottom)
2. Persist user preferences
3. Final testing and bug fixes
4. Documentation and deployment

## Success Metrics

### Engagement
- % of users who try narration feature
- Average listening duration per session
- Narration completion rate

### Impact
- Writing session duration with vs without narration
- Post completion rate with narration
- User satisfaction feedback

### Technical
- Audio load time < 2 seconds
- Smooth playback without interruptions
- < 1% error rate in audio playback

## Risks & Mitigations

### Risk: Large audio files causing slow load times
**Mitigation**: 
- Implement progressive loading
- Compress audio files appropriately
- Cache frequently used narrations

### Risk: Player interfering with user writing
**Mitigation**:
- Keep player UI minimal and unobtrusive
- Easy one-click close option
- Remember user preferences

### Risk: Audio continuing unexpectedly
**Mitigation**:
- Clear visual indicators of playback state
- Auto-pause on certain navigation events
- Explicit user control over playback

## Open Questions

1. Should narrations be board-specific or global?
2. How do we handle narration recommendations?
3. Should we support user-uploaded narrations in the future?
4. What analytics should we track for narration usage?
5. How do we moderate/curate narration content?

## Appendix

### API Endpoints (Firebase Functions)
- No additional endpoints needed initially (uses existing Firestore)
- Future: Analytics tracking endpoints

### Security Rules
```javascript
// Firestore rules for narrations
match /narrations/{narrationId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == resource.data.createdBy;
  
  match /sections/{sectionId} {
    allow read: if request.auth != null;
    allow write: if request.auth.uid == get(/databases/$(database)/documents/narrations/$(narrationId)).data.createdBy;
  }
}
```

### Dependencies
- HTML5 Audio API for playback
- Firebase Storage for audio hosting
- React Context for state management
- Existing UI components from shared/ui

## References
- [Narration.ts model](/src/narration/model/Narration.ts)
- [WritingActionButton component](/src/board/components/WritingActionButton.tsx)
- [BottomNavigatorLayout](/src/shared/components/BottomNavigatorLayout.tsx)