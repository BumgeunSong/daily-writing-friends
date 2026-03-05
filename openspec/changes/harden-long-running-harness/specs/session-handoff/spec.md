## ADDED Requirements

### Requirement: Handoff instruction appended by session.sh

`session.sh` SHALL append a handoff instruction to the system prompt for every session automatically. No individual prompt file edits needed.

#### Scenario: Handoff footer appended
- **WHEN** `session.sh` builds the system prompt
- **THEN** a handoff instruction is appended telling the agent to write `openspec/changes/<change-name>/handoff.md` before finishing

#### Scenario: Agent writes handoff
- **WHEN** a session completes its primary task
- **THEN** it writes `handoff.md` containing: what was done, files changed, key decisions, notes for next session

#### Scenario: New prompts get handoff automatically
- **WHEN** a new prompt file is added to the harness
- **THEN** it automatically gets the handoff instruction without manual edits (because `session.sh` appends it)
