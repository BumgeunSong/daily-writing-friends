# Audio Narration Player PRD

## Overview
A feature that provides audio narration guidance to help users write more easily. Users can select and listen to curated audio narrations while writing, with a drawer-based audio player that provides both expanded and minimized views during the writing session.

## Problem Statement
Users may benefit from audio guidance and prompts while writing to:
- Overcome writer's block
- Stay focused on their writing task
- Receive structured writing guidance
- Make the writing experience more engaging and interactive

## Goals
1. Provide seamless audio narration playback during writing sessions
2. Create a non-intrusive but easily accessible audio player interface using drawer component
3. Maintain audio playback only within the writing session (not persistent across navigation)
4. Enable users to discover and select from multiple narrations before starting to write

## User Stories

### As a writer
- I want to select "오디오 가이드" from the WritingActionButton menu
- I want to browse available audio guides on an intro page
- I want to select ONE audio guide and start writing with it
- I want to see an expanded player drawer when I start writing
- I want to minimize the player to a floating bar by clicking outside
- I want to expand the player again by clicking the floating bar
- I want to see the guide title and total duration in the minimized view
- I want to pause/resume narration at any time
- I want silence during pauseMinutes between sections (built into the guide)
- I want to be warned before leaving if I have unsaved content or audio is playing
- I want my playback position restored if I return within 30 minutes
- I want to go back to intro page if I want to listen to a different guide

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
  - content?: string (optional description)
  - createdBy: string
  - createdAt: Timestamp
  - updatedAt: Timestamp
  - totalDuration?: number (calculated client-side)

/narrations/{narrationId}/sections/{sectionId}
  - id: string
  - order: number (explicit ordering for playback sequence)
  - title: string
  - script: string
  - pauseMinutes: number (silence gap after section)
  - storagePath: string (Firebase Storage path)
  - audioDuration?: number (cached duration in seconds)
  - createdAt: Timestamp
  - updatedAt: Timestamp
```

#### Firebase Storage
- Audio files stored at paths specified in `storagePath`
- Format: `audio/webm;codecs=opus`
- **File Granularity**: One audio file per section (not concatenated)

### Component Architecture

```
src/narration/
├── api/
│   └── narration.ts          # Firestore queries
├── components/
│   ├── AudioGuideIntro.tsx   # Intro page with guide selection
│   ├── AudioGuideList.tsx    # List of available audio guides
│   ├── AudioPlayerDrawer.tsx # Drawer-based player component
│   └── FloatingAudioBar.tsx  # Minimized player bar
├── hooks/
│   ├── useAudioPlayer.ts     # Core playback logic
│   └── useNarrations.ts      # Data fetching hooks
├── model/
│   └── Narration.ts          # TypeScript types (existing)
└── utils/
    └── audioUtils.ts         # Audio helper functions

src/post/components/
└── AudioGuideWritingPage.tsx # Writing page with audio player
```

## Features

### Phase 1: Core Player (MVP)

#### 1. Navigation Flow
- **WritingActionButton Integration**: Add "오디오 가이드" option to the action menu
- **Intro Page**: Similar to PostFreewritingIntro, shows available audio guides
- **Writing Page**: Dedicated AudioGuideWritingPage with integrated player

#### 2. Audio Player UI
- **Drawer Component**: Uses shadcn drawer for expanded player view
- **Floating Bar**: Minimized view showing title and time remaining
- **Smooth Transitions**: Animated expansion/collapse between states
- **Controls**: Play/pause button, progress indicator, close button

#### 3. Writing Experience
- **Auto-open Drawer**: Player drawer opens automatically when entering writing page
- **Click-to-minimize**: Click dimmed area to minimize to floating bar
- **Click-to-expand**: Click floating bar to re-open drawer
- **No Draft Feature**: Simplified experience without auto-save
- **Submit Button**: Allows posting when ready

#### 4. Playback Management
- **Single Guide Per Session**: One narration plays per writing session
- **Section Transitions**: Automatic silence (pauseMinutes) between sections
- **Pause Control**: User-initiated pause is different from section gaps
- **Background Handling**: Pause when app backgrounded or screen locked
- **Duration Calculation**: Extract total duration client-side from audio metadata
- **Prevent Double-play**: Guard against multiple simultaneous narrations

#### 5. Navigation & Persistence
- **Leave Confirmation**: Alert dialog when attempting to navigate away if:
  - Audio is currently playing OR
  - User has written any unsaved content
- **Confirmation Message**: "You have unsaved content and audio will stop. Are you sure you want to leave?"
- **Navigation Target**: Navigate to board page (`/boards/{boardId}`) when user leaves
- **Audio Cleanup**: Stop playback when user confirms navigation
- **Session Recovery**: Restore playback position if returning within 30 minutes (same board, user, guide)
- **Soft Navigation**: Maintain state during React Router transitions
- **Hard Navigation**: Clear state on page reload

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

### Audio Guide Intro Page
Similar to PostFreewritingIntro with:
- Title: "오디오 가이드와 함께 글쓰기"
- Description of the feature
- Grid/List of available audio guides
- Each guide shows: title, duration, description
- CTA button to start with selected guide

### Audio Player States

#### Drawer (Expanded)
```
┌─────────────────────────────────────┐
│         [Dimmed Background]         │
│                                     │
├─────────────────────────────────────┤
│  🎧 Introduction to Freewriting     │
│                                     │
│  Section 2 of 5                     │
│  "Now, let's explore..."            │
│                                     │
│  [⏸]  ───●────────  3:30 / 15:00   │
│                                     │
│  [Close Drawer ↓]                   │
└─────────────────────────────────────┘
```

#### Floating Bar (Minimized - Top Position)
```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐  │
│  │ ▶ Freewriting Guide • 15:00 │  │ <- Fixed at top, click to expand
│  └─────────────────────────────┘  │
│                                     │
│      [Editor Toolbar if shown]     │
│                                     │
│         [Writing Content]           │
│                                     │
└─────────────────────────────────────┘
```
Note: 
- Floating bar fixed at top to avoid keyboard conflicts
- Shows total duration (includes all sections + pause times)
- Progress shows elapsed time / total duration

### AudioGuideWritingPage Layout
```
┌─────────────────────────────────────┐
│         [Page Header]               │
├─────────────────────────────────────┤
│  [Floating Audio Bar - Top Fixed]  │
│                                     │
│    [Title Editor]                   │
│                                     │
│    [Post Editor with Toolbar]       │
│                                     │
│    [Submit Button]                  │
│                                     │
│    [Drawer Overlay when expanded]   │
└─────────────────────────────────────┘
```

## Playback Lifecycle Specification

### File Structure Assumptions

#### Section Ordering
- Each section has an explicit `order: number` field in Firestore
- Sections are played sequentially by order value (ascending)
- Missing order values or gaps will cause playback errors

#### Audio Duration Management
- Audio durations are extracted client-side using HTML5 audio metadata
- Durations are cached in Firestore `sections/{sectionId}.audioDuration` field after first extraction
- If cached duration exists, use cached value to avoid re-extraction

#### Playback Validation
- Before starting playback, validate all sections exist and have valid audio files
- If any section is missing or unloadable, show error and prevent playback start

### Silence Gap Implementation

#### Gap Behavior
- Progress bar continues moving during `pauseMinutes` silence gaps
- No skip functionality - users must wait through full writing time
- Visual state clearly indicates "Writing Time" vs "Listening Time"

#### Gap Timing
```typescript
// During silence gap
currentState = {
  type: 'silence',
  remainingSeconds: pauseMinutes * 60,
  totalElapsed: previousSectionsTime + currentSectionTime + gapElapsed
}
```

#### User Interactions During Gaps
- User can pause/resume during silence (affects gap timer)
- Seeking is disabled during silence gaps
- Drawer shows "Writing Time: 2:30 remaining" instead of audio waveform

### Playback Position Storage

#### Storage Location
- Use `sessionStorage` for recovery data (persists browser sessions, clears on browser close)
- Storage key: `audioGuide_recovery_${userId}_${boardId}_${narrationId}`

#### Recovery Data Structure
```typescript
interface AudioRecoveryData {
  narrationId: string;
  boardId: string;
  userId: string;
  sectionIndex: number;
  sectionTimestamp: number; // position within current section audio
  silenceRemaining?: number; // remaining silence time if in gap
  totalElapsed: number; // for progress display
  savedAt: number; // Unix timestamp for 30-minute window
}
```

#### Position Saving Frequency
- Save position every 5 seconds during audio playback
- Save immediately on pause/resume
- Save position during silence gaps (track remaining silence time)
- Clear recovery data on successful submit or intentional navigation

### Automatic Stop Triggers

#### Immediate Stops
- **Submit Button Clicked**: Audio stops immediately, recovery data cleared
- **Navigation Confirmed**: Audio stops, recovery data cleared
- **Tab Focus Lost**: Audio pauses (can be resumed)
- **Page Visibility Hidden**: Audio pauses (can be resumed)
- **Device Screen Lock**: Audio pauses (can be resumed)

#### Recovery vs Clear
- **Pause triggers** (focus lost, backgrounded): Keep recovery data, allow resume
- **Stop triggers** (submit, navigate): Clear recovery data permanently

#### Session Timeout
- Recovery data expires after 30 minutes
- On expired recovery, start from beginning (user notification recommended)

### Error Handling Specifications

#### Network Issues
- If audio fails to load: Show error, allow retry, prevent playback start
- If network disconnects during playback: Pause automatically, show connection status
- On network restore: Allow user to resume from last saved position

#### Missing Resources
- If narration deleted: Clear recovery data, show error message
- If sections modified: Validate recovery data, start fresh if incompatible
- If audio files corrupted: Skip to next section with user notification

#### Recovery Data Validation
```typescript
function validateRecoveryData(data: AudioRecoveryData): boolean {
  // Check 30-minute window
  if (Date.now() - data.savedAt > 30 * 60 * 1000) return false;
  
  // Validate narration still exists and matches
  if (!currentNarration || currentNarration.id !== data.narrationId) return false;
  
  // Validate section index is still valid
  if (data.sectionIndex >= currentNarration.sections.length) return false;
  
  return true;
}
```

## Technical Implementation Details

### Audio Playback Architecture

#### 1. File Structure
- **Per-Section Files**: Each section is a separate audio file
- **No Pre-concatenation**: Sections remain as individual files

#### 2. Silence Implementation (Recommended: Programmatic)
**Option A: Programmatic Insertion (RECOMMENDED)**
- Player inserts silence between sections using setTimeout
- Advantages:
  - Flexible pause durations (can be adjusted without re-processing)
  - Smaller file sizes
  - Visual feedback during pauses ("Writing time remaining: 2:30")
  - Can skip/adjust pauses in future features
- Implementation: Play section → Wait pauseMinutes → Play next section

**Option B: Pre-processed Files**
- Insert silence when creating audio files
- Disadvantages:
  - Larger files
  - Fixed pause durations
  - No visual feedback during silence
  - Harder to maintain

#### 3. Progress & Duration Calculation
```typescript
// Total duration = sum of all section durations + all pause durations
totalDuration = sections.reduce((total, section, index) => {
  const sectionDuration = section.audioDuration; // from metadata
  const pauseDuration = section.pauseMinutes * 60;
  return total + sectionDuration + pauseDuration;
}, 0);

// Current progress tracking
currentProgress = {
  sectionIndex: number,
  sectionTime: number, // time within current section audio
  totalElapsed: number // includes past sections + pauses
}
```

#### 4. Session Recovery Details
```typescript
interface RecoveryData {
  boardId: string;
  userId: string;
  narrationId: string;
  sectionIndex: number;
  sectionTimestamp: number; // position within current section
  totalElapsed: number;
  savedAt: number; // Unix timestamp for 30-min window
}

// Recovery logic
// Ensure the correct section's audio is loaded and the audio element exists before resuming.
if (
  Date.now() - recoveryData.savedAt < 30 * 60 * 1000 &&
  typeof audio !== "undefined" &&
  audio instanceof HTMLAudioElement &&
  currentSectionIndex === recoveryData.sectionIndex
) {
  // Resume at exact position within section
  audio.currentTime = recoveryData.sectionTimestamp;
}
```

## Implementation Plan

### Week 1: Navigation & Pages
1. Add "오디오 가이드" action to WritingActionButton
2. Create AudioGuideIntro page with guide selection
3. Implement AudioGuideWritingPage with editor components
4. Add routing and navigation between pages

### Week 2: Audio Player Components
1. Build AudioPlayerDrawer with shadcn drawer
2. Create FloatingAudioBar for minimized state
3. Implement expand/collapse interactions
4. Add audio playback with HTML5 audio API

### Week 3: Data & State Management
1. Create Firestore queries for narrations
2. Implement useAudioPlayer hook for playback logic
3. Connect to Firebase Storage for audio files
4. Add session recovery (30-minute window)

### Week 4: Polish & Testing
1. Add navigation guards with confirmation dialog (check unsaved content + audio state)
2. Implement board page navigation on leave
3. Handle edge cases and errors
4. Test drawer animations and interactions across different devices

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