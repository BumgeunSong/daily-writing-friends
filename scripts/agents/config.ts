// scripts/agents/config.ts

// Agent configurations
export const AGENT_CONFIG = {
  analyzer: {
    maxTurns: 3, // Just analysis, no exploration
    allowedTools: [] as string[],
  },
  planner: {
    maxTurns: 40, // Needs to explore codebase + create plan
    allowedTools: ["Glob", "Read", "Grep"],
  },
  coder: {
    maxTurns: 50, // Needs to read, edit, possibly run commands
    allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
  },
  reviewer: {
    maxTurns: 20, // Run 4 checks + read files
    allowedTools: ["Read", "Bash", "Grep", "Glob"],
  },
};

// Pipeline configurations
export const PIPELINE_CONFIG = {
  maxRevisionRounds: 2,
  maxIssuesToAnalyze: 3,
};

// GitHub configurations
export const GITHUB_CONFIG = {
  owner: "BumgeunSong",
  repo: "DailyWritingFriends",
};
