# CONTEXT

Domain language for Daily Writing Friends. Use these terms exactly in code, comments, commits, and architecture discussions. The names of modules and seams should follow this glossary.

## Terms

**Draft**
A user's in-progress writing for a specific board, not yet published as a Post. Persisted in the `drafts` table, scoped to one user and one board, identified by a UUID. A user can have multiple drafts per board. Becomes a Post when published.

**Autosave**
The background mechanism that periodically persists the current contents of an in-progress Draft without user action. Runs while the user is editing. Coalesces concurrent attempts (see Draft Autosave module's interface).

**Manual Save**
An explicit user-triggered save of the current Draft contents. Distinct from Autosave: must always result in the latest content being persisted exactly once after any in-flight save completes.

**Board**
A cohort container. Groups posts written by members of one writing cohort.

**Post**
A published piece of daily writing on a Board. Created from a Draft (or directly).
