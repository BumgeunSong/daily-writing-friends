// scripts/agents/test-single-agent.ts

import { query } from "@anthropic-ai/claude-agent-sdk";
import "dotenv/config";

async function testAnalyzer() {
  console.log("🔍 Starting Analyzer Agent Test...");
  console.log("=".repeat(50));

  for await (const message of query({
    prompt: `
      You are analyzing the daily-writing-friends codebase.
      
      1. List the main directories in this project
      2. Identify the tech stack (React, Firebase, etc.)
      3. Find the main entry point files
      
      Output a brief summary.
    `,
    options: {
      allowedTools: ["Glob", "Read", "Bash"],
      maxTurns: 10,
    },
  })) {
    if (message.type === "assistant") {
      console.log("[Assistant]", message.message.content);
    } else if (message.type === "result") {
      // Check subtype to access correct properties
      if (message.subtype === "success") {
        console.log("[Result]", message.result);
        console.log("[Cost]", `$${message.total_cost_usd.toFixed(4)}`);
      } else {
        // Error cases: error_max_turns, error_during_execution, etc.
        console.log("[Error]", message.subtype);
        console.log("[Errors]", message.errors);
      }
    } else if (message.type === "system") {
      console.log("[System]", message.subtype, "- Session:", message.session_id);
    }
  }

  console.log("=".repeat(50));
  console.log("✅ Test complete!");
}

testAnalyzer().catch(console.error);