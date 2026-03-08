Narrative Guide Recording Feature PRD

1. Purpose

Enable admin-level writing coaches to author, section, and record narration scripts for guided audio walkthroughs in the Daily Writing Friends admin dashboard. Coaches can type their script, split it into logical sections, record each section separately (with optional pauses), review and overwrite recordings, and upload audio to Firebase Storage.

2. Scope
	•	Script authoring via plain textarea
	•	Manual section creation (title + script)
	•	Section-by-section audio recording using react-audio-voice-recorder
	•	Pause insertion (1–10 minutes) after each section
	•	Local playback & re-recording controls (record, stop, play)
	•	Audio file storage in Firebase Storage at /narrations/{narrationId}/{sectionIndex}.mp3
	•	Automatic deletion of overwritten (stale) recordings
	•	Toast notifications for errors via shadcn/ui
	•	Desktop-only admin feature

3. Context

This feature lives within the Next.js 15 + React 18 + TypeScript admin dashboard (see Claude.md). It integrates with:
	•	Firebase: Firestore for sub-documents; Storage for audio files
	•	React Query v5: for data fetching and mutations
	•	Tailwind CSS & shadcn/ui: for styling and toasts
	•	react-audio-voice-recorder: for recording with noise suppression and echo cancellation

4. Objectives & Success Metrics
	•	Authoring efficiency: Coaches can create and record a 10-section narration in under 5 minutes
	•	Audio quality: ≥90% of recordings pass internal clarity checks
	•	Reliability: <1% recording failures (proper error toasts shown)
	•	Maintainability: Feature follows existing code patterns and folder structure

5. Stakeholders
	•	Writing Coach (Admin): primary user of recording feature
	•	Frontend Engineers: implement UI & integration
	•	Backend/DevOps: configure Firebase Storage rules

6. Functional Requirements

6.1 Script & Section Management
	•	Add Section: click “Add Section” → opens a card with:
	•	Section Title text input
	•	Script textarea input
	•	Pause dropdown (1–10 min)
	•	Record/Stop/Play buttons
	•	Delete Section: remove section and its audio file
	•	Preview Script: live display of entered script and title

6.2 Recording Controls
	•	Record: initiates MediaRecorder via react-audio-voice-recorder
	•	Stop: stops recording and returns audio blob
	•	Play: plays back the latest recorded blob
	•	Re-record: pressing Record again overwrites existing blob and deletes old file on upload

6.3 Pause Insertion
	•	Dropdown selects pause duration (1–10 full minutes)
	•	Pause metadata saved alongside section data
	•	Applied after the section during playback (front-end consumer)

6.4 Storage & Deletion
	•	On “Save Section”: upload blob to Firebase Storage path /narrations/{narrationId}/{sectionIndex}.mp3
	•	If existing file at same path, delete before uploading
	•	Store section metadata in Firestore as sub-document under narrations/{narrationId}/sections/{sectionId}:

{
  title: string,
  script: string,
  pauseMinutes: number,
  storagePath: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}



6.5 Error Handling
	•	If recording permission or upload fails:
	•	Show shadcn <Toast> with error message
	•	Allow retry (record/upload)
	•	Maintain recording state in component state only

7. Non-Functional Requirements
	•	Desktop-only: hide or disable controls on mobile
	•	Performance: lazy-load react-audio-voice-recorder
	•	Security: Firebase Storage rules restrict writes to admin users only
	•	Accessibility: buttons labeled for screen readers

8. Data Model & Firestore Schema

narrations (collection)
 └── {narrationId} (doc)
      ├── metadata: { title, createdBy, createdAt }
      └── sections (sub-collection)
           └── {sectionId} (doc)
                ├── title: string
                ├── script: string
                ├── pauseMinutes: number
                ├── storagePath: string
                ├── createdAt: Timestamp
                └── updatedAt: Timestamp

9. Component Breakdown

src/components/admin/narration/
├── NarrationEditor.tsx       // parent page, loads Firestore narration doc
├── SectionList.tsx           // maps sections → <SectionCard />
└── SectionCard.tsx           // handles script, title, pause, record/play UI

	•	Hooks:
	•	useNarration(id): fetch/mutate narration metadata and sections
	•	useSection(narrationId, sectionId): upload/delete audio + save metadata

10. UI Wireframes (Sketch)
	1.	NarrationEditor
	•	Header: narration title + “Add Section” button
	•	List of SectionCards
	2.	SectionCard
	•	Inputs: Title, Textarea for script
	•	Controls row: Pause dropdown | Record | Stop | Play | Delete
	•	State indicators: recording/in-progress spinner

11. Future Considerations
	•	Drag-and-drop reordering
	•	Automatic section splitting via NLP
	•	Waveform visualization
	•	End-user playback controls

⸻

Prepared by Product & Engineering Team