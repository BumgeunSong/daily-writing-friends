// scripts/agents/cache-utils.ts

import * as fs from "fs";
import * as path from "path";

const CACHE_DIR = path.join(__dirname, "cache");

type CacheStage = "analyzer" | "planner" | "coder" | "reviewer";

function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCacheFilePath(stage: CacheStage): string {
  const dateString = getTodayDateString();
  return path.join(CACHE_DIR, `${dateString}_${stage}.json`);
}

function ensureCacheDirectory(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export function readCache<T>(stage: CacheStage): T | null {
  const filePath = getCacheFilePath(stage);

  if (!fs.existsSync(filePath)) {
    console.log(`   [CACHE] No cache found for ${stage}`);
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content) as T;
    console.log(`   [CACHE] Loaded ${stage} from cache`);
    return data;
  } catch (error) {
    console.log(`   [CACHE] Failed to read cache for ${stage}: ${error}`);
    return null;
  }
}

export function writeCache<T>(stage: CacheStage, data: T): void {
  ensureCacheDirectory();
  const filePath = getCacheFilePath(stage);

  try {
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`   [CACHE] Saved ${stage} to cache`);
  } catch (error) {
    console.log(`   [CACHE] Failed to write cache for ${stage}: ${error}`);
  }
}

export function clearAllCache(): void {
  console.log("\n🗑️  Clearing all cache...");

  if (!fs.existsSync(CACHE_DIR)) {
    console.log("   [CACHE] No cache directory found");
    return;
  }

  const files = fs.readdirSync(CACHE_DIR);
  let clearedCount = 0;

  for (const file of files) {
    if (file.endsWith(".json")) {
      const filePath = path.join(CACHE_DIR, file);
      fs.unlinkSync(filePath);
      clearedCount++;
    }
  }

  console.log(`   [CACHE] Cleared ${clearedCount} cache file(s)`);
}

export function clearTodayCache(): void {
  console.log("\n🗑️  Clearing today's cache...");

  if (!fs.existsSync(CACHE_DIR)) {
    console.log("   [CACHE] No cache directory found");
    return;
  }

  const dateString = getTodayDateString();
  const files = fs.readdirSync(CACHE_DIR);
  let clearedCount = 0;

  for (const file of files) {
    if (file.startsWith(dateString) && file.endsWith(".json")) {
      const filePath = path.join(CACHE_DIR, file);
      fs.unlinkSync(filePath);
      clearedCount++;
    }
  }

  console.log(`   [CACHE] Cleared ${clearedCount} cache file(s) for ${dateString}`);
}

export function hasFreshFlag(): boolean {
  return process.argv.includes("--fresh");
}
