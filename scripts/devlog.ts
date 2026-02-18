import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LogEntry {
  timestamp: string;
  category: string;
  event: string;
  level: string;
  correlationId: string;
  data?: Record<string, unknown>;
  duration?: number;
}

function getLatestLogFile(): string | null {
  const logsDir = path.join(path.dirname(__dirname), '.logs');

  if (!fs.existsSync(logsDir)) {
    return null;
  }

  const files = fs.readdirSync(logsDir).filter((f) => f.startsWith('dev-') && f.endsWith('.jsonl'));

  if (files.length === 0) {
    return null;
  }

  // Sort descending by name (which are ISO dates)
  files.sort().reverse();
  return path.join(logsDir, files[0]);
}

function parseLogFile(filePath: string): LogEntry[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter((line) => line.trim());

  return lines.map((line) => {
    try {
      return JSON.parse(line) as LogEntry;
    } catch (error) {
      console.error(`Failed to parse line: ${line}`);
      throw error;
    }
  });
}

function formatEntry(entry: LogEntry): string {
  const emoji = entry.level === 'error' ? '❌' : entry.level === 'warn' ? '⚠️' : '✅';
  const durationStr = entry.duration !== undefined ? ` (${entry.duration}ms)` : '';
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';

  return `${emoji} [${entry.timestamp}] ${entry.category}/${entry.event}${durationStr}${dataStr}`;
}

function commandRecent(entries: LogEntry[], limit: number) {
  const recentEntries = entries.slice(-limit);
  console.log(`\n📋 Last ${recentEntries.length} entries:\n`);
  recentEntries.forEach((entry) => console.log(formatEntry(entry)));
}

function commandErrors(entries: LogEntry[]) {
  const errorEntries = entries.filter((e) => e.level === 'error' || e.level === 'warn');

  if (errorEntries.length === 0) {
    console.log('\n✅ No errors or warnings found\n');
    return;
  }

  console.log(`\n⚠️  Found ${errorEntries.length} errors/warnings:\n`);
  errorEntries.forEach((entry) => console.log(formatEntry(entry)));
}

function commandCheck(entries: LogEntry[]) {
  const errors = entries.filter((e) => e.level === 'error');
  const warnings = entries.filter((e) => e.level === 'warn');
  const mismatches = entries.filter(
    (e) => e.category === 'shadow-read' && e.event === 'compare-mismatch'
  );

  console.log('\n📊 DevLog Summary:');
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Warnings: ${warnings.length}`);
  console.log(`   Shadow-read mismatches: ${mismatches.length}`);

  if (errors.length > 0) {
    console.log('\n--- Errors ---');
    errors.forEach((e) => console.log(formatEntry(e)));
  }
  if (mismatches.length > 0) {
    console.log('\n--- Shadow Read Mismatches ---');
    mismatches.forEach((e) => console.log(formatEntry(e)));
  }

  if (errors.length > 0) {
    console.log('\n❌ DevLog check failed (errors found)\n');
    process.exit(1);
  }

  console.log('\n✅ DevLog check passed\n');
  process.exit(0);
}

function commandTrace(entries: LogEntry[], correlationId: string) {
  const matchingEntries = entries.filter((e) => e.correlationId === correlationId);

  if (matchingEntries.length === 0) {
    console.log(`\n⚠️  No entries found for correlationId: ${correlationId}\n`);
    return;
  }

  console.log(`\n🔍 Trace for correlationId: ${correlationId}\n`);
  console.log(`   Found ${matchingEntries.length} entries:\n`);
  matchingEntries.forEach((entry) => console.log(formatEntry(entry)));
}

function main() {
  const command = process.argv[2] || 'recent';
  const arg = process.argv[3];

  const logFile = getLatestLogFile();

  if (!logFile) {
    if (command === 'check') {
      console.log('\n✅ No log files found - check passed\n');
      process.exit(0);
    }
    console.log('\n📁 No log files found in .logs/ directory\n');
    return;
  }

  const entries = parseLogFile(logFile);
  console.log(`\n📂 Log file: ${path.basename(logFile)}`);
  console.log(`📊 Total entries: ${entries.length}`);

  switch (command) {
    case 'recent':
      const limit = arg ? parseInt(arg, 10) : 20;
      commandRecent(entries, limit);
      break;

    case 'errors':
      commandErrors(entries);
      break;

    case 'check':
      commandCheck(entries);
      break;

    case 'trace':
      if (!arg) {
        console.error('\n❌ Error: correlationId required for trace command\n');
        console.error('Usage: npm run devlog:trace <correlationId>\n');
        process.exit(1);
      }
      commandTrace(entries, arg);
      break;

    default:
      console.error(`\n❌ Unknown command: ${command}\n`);
      console.error('Available commands: recent, errors, check, trace\n');
      process.exit(1);
  }
}

main();
