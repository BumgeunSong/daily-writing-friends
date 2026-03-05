## ADDED Requirements

### Requirement: Frontmatter-based skill matching

A standalone script (`match-skills.sh`) SHALL resolve keywords to skill names by reading SKILL.md frontmatter dynamically.

#### Scenario: Keyword matches skill description
- **WHEN** `match-skills.sh <keyword>` is called
- **THEN** it scans `.claude/skills/*/SKILL.md` (project-level) then `~/.claude/skills/*/SKILL.md` (user-level), parses YAML frontmatter (`name` and `description` fields), and returns skill names whose frontmatter matches the keyword (case-insensitive). Project skills take priority on name collision.

#### Scenario: No match
- **WHEN** no SKILL.md frontmatter matches the keyword
- **THEN** empty output is returned (exit 0)

#### Scenario: Skill name validation
- **WHEN** a SKILL.md has a `name:` field containing path traversal characters (e.g., `../../etc`)
- **THEN** the name is filtered out (only names matching `^[a-z0-9][a-z0-9_-]{0,63}$` are emitted)

#### Scenario: Name collision across directories
- **WHEN** a project-level and user-level skill share the same `name:` value
- **THEN** only the project-level skill is returned (project takes priority)

### Requirement: Skill detection from task content

The harness SHALL detect relevant skills by scanning task group content for search keywords and resolving them via `match-skills.sh`.

#### Scenario: Keyword found in task content
- **WHEN** the task group section contains a search keyword (e.g., `component`, `test`, `firebase`, `api/`, `hook`, `type`, etc.)
- **THEN** `match-skills.sh <keyword>` is called and matching skill names are included in the injection list

#### Scenario: Multiple keywords resolve to same skill
- **WHEN** multiple search keywords resolve to the same skill name
- **THEN** the skill appears only once in the final list (deduplicated)

### Requirement: Always-injected skills by phase

Certain skills SHALL always be injected for specific phases regardless of keyword matching.

#### Scenario: Apply phases
- **WHEN** the phase is `apply-group`
- **THEN** `code-style` is always injected

#### Scenario: Verify phase
- **WHEN** the phase is `verify`
- **THEN** `testing`, `type-system`, `code-style`, and `agent-browser` are always injected

#### Scenario: Design phase
- **WHEN** the phase is `design`
- **THEN** `daily-writing-friends-design` is always injected

### Requirement: Skill content injected into system prompt

Detected skills MUST be read from `.claude/skills/{name}/SKILL.md` and appended to the session's system prompt.

#### Scenario: Skills passed to session.sh
- **WHEN** `run.sh` determines a skill list
- **THEN** the list is exported as `HARNESS_SKILLS` environment variable before invoking `session.sh`

#### Scenario: Skill content appended
- **WHEN** `session.sh` receives a non-empty skills argument
- **THEN** each SKILL.md file is read and appended to the system prompt under a `## Project Conventions (from skills)` header, BEFORE the handoff footer

#### Scenario: Skill path resolution order
- **WHEN** `session.sh` resolves a skill name to a file path
- **THEN** it checks `.claude/skills/{name}/SKILL.md` (project-level) first, then `~/.claude/skills/{name}/SKILL.md` (user-level), using the first found. Resolved path must stay within the skills root (realpath check prevents symlink escapes).

#### Scenario: Missing skill file
- **WHEN** a skill name is passed but `.claude/skills/{name}/SKILL.md` does not exist
- **THEN** the skill is silently skipped (no error)

#### Scenario: Injected skills logged
- **WHEN** skills are injected into a session
- **THEN** the injected skill names are logged to `harness.log`
