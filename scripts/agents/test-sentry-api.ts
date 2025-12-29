// scripts/agents/test-sentry-api.ts

import "dotenv/config";

const SENTRY_READ_TOKEN = process.env.SENTRY_READ_TOKEN;
const ORG_SLUG = "bumgeun-song";
const PROJECT_SLUG = "daily-writing-friends";

async function fetchRecentErrors() {
  console.log("🔍 Fetching recent Sentry errors...\n");

  const response = await fetch(
    `https://sentry.io/api/0/projects/${ORG_SLUG}/${PROJECT_SLUG}/issues/?query=is:unresolved&statsPeriod=24h`,
    {
      headers: {
        Authorization: `Bearer ${SENTRY_READ_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    console.error("❌ Sentry API Error:", response.status, response.statusText);
    const text = await response.text();
    console.error(text);
    return;
  }

  const issues = await response.json();

  console.log(`Found ${issues.length} unresolved issues in last 24h:\n`);

  for (const issue of issues.slice(0, 5)) {
    console.log("─".repeat(50));
    console.log(`Title: ${issue.title}`);
    console.log(`ID: ${issue.id}`);
    console.log(`Level: ${issue.level}`);
    console.log(`Events: ${issue.count}`);
    console.log(`Users affected: ${issue.userCount}`);
    console.log(`First seen: ${issue.firstSeen}`);
    console.log(`Last seen: ${issue.lastSeen}`);
    console.log(`Link: ${issue.permalink}`);
  }

  return issues;
}

async function fetchIssueDetails(issueId: string) {
  console.log(`\n🔍 Fetching details for issue ${issueId}...\n`);

  const response = await fetch(
    `https://sentry.io/api/0/issues/${issueId}/events/latest/`,
    {
      headers: {
        Authorization: `Bearer ${SENTRY_READ_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    console.error("❌ Error fetching issue details:", response.status);
    return;
  }

  const event = await response.json();

  console.log("─".repeat(50));
  console.log("LATEST EVENT DETAILS:");
  console.log("─".repeat(50));

  if (event.entries) {
    for (const entry of event.entries) {
      if (entry.type === "exception") {
        console.log("\n📛 EXCEPTION:");
        for (const value of entry.data.values || []) {
          console.log(`  Type: ${value.type}`);
          console.log(`  Value: ${value.value}`);
          if (value.stacktrace?.frames) {
            console.log(`  Stack trace (last 5 frames):`);
            const frames = value.stacktrace.frames.slice(-5);
            for (const frame of frames) {
              console.log(`    - ${frame.filename}:${frame.lineNo} in ${frame.function}`);
            }
          }
        }
      }
    }
  }

  return event;
}

async function main() {
  if (!SENTRY_READ_TOKEN) {
    console.error("❌ SENTRY_READ_TOKEN not found in .env");
    return;
  }

  const issues = await fetchRecentErrors();

  if (issues && issues.length > 0) {
    await fetchIssueDetails(issues[0].id);
  } else {
    console.log("\n✅ No unresolved issues in last 24h!");
  }
}

main().catch(console.error);